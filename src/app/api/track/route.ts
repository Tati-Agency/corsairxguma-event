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
      }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[track]", err);
    // Analytics must never break the page
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}
