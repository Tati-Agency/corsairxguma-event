import { NextRequest, NextResponse } from "next/server";
import { getAppwrite } from "@/lib/appwrite";
import { APPWRITE, EVENT } from "@/lib/config";
import { getClientIp, hashIdentity, isBot, parseUa } from "@/lib/ua";
import { rateLimit } from "@/lib/rate-limit";
import { Query } from "node-appwrite";

export const runtime = "nodejs";

interface TrackBody {
  sessionId?: string;
  referrer?: string;
}

/**
 * Quốc gia / thành phố suy ra từ IP — Vercel tự gắn header vào mọi request.
 * Chạy ở localhost thì KHÔNG có header nên 2 field này để rỗng.
 *
 * Lưu ý: `x-vercel-ip-city` trả chuỗi percent-encoded theo RFC3986
 * (vd "H%E1%BB%93%20Ch%C3%AD%20Minh") nên phải decode trước khi lưu.
 */
function geoFromHeaders(headers: Headers) {
  const country = (headers.get("x-vercel-ip-country") ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 2);

  const rawCity = headers.get("x-vercel-ip-city") ?? "";
  let city = rawCity;
  if (rawCity) {
    try {
      city = decodeURIComponent(rawCity);
    } catch {
      // Chuỗi % không hợp lệ → giữ nguyên bản gốc
    }
  }

  return { country, city: city.trim().slice(0, 64) };
}

export async function POST(req: NextRequest) {
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (isBot(ua)) return NextResponse.json({ ok: true, ignored: "bot" });

    const ip = getClientIp(req.headers);
    if (!rateLimit(`track:${ip}`, 30)) {
      return NextResponse.json({ ok: true, ignored: "rate_limited" });
    }

    const body = (await req.json().catch(() => ({}))) as TrackBody;
    const sessionId =
      typeof body.sessionId === "string" && body.sessionId.length <= 64
        ? body.sessionId
        : null;
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "missing_session" }, { status: 400 });
    }

    const { tablesDB } = getAppwrite();

    // Dedupe: one page-view log per session per event
    const existing = await tablesDB.listRows(
      APPWRITE.databaseId,
      APPWRITE.colVisits,
      [
        Query.equal("session_id", sessionId),
        Query.equal("event_id", EVENT.slug),
        Query.limit(1),
      ]
    );
    if (existing.total > 0) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const info = parseUa(ua);
    const { country, city } = geoFromHeaders(req.headers);

    await tablesDB.createRow(
      APPWRITE.databaseId,
      APPWRITE.colVisits,
      "unique()",
      {
        event_id: EVENT.slug,
        session_id: sessionId,
        session_hash: hashIdentity(ip, ua),
        device: info.device,
        browser: info.browser,
        os: info.os,
        referrer: (body.referrer ?? "direct").slice(0, 200),
        country,
        city,
      }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[visit]", err);
    // Analytics must never break the page
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}
