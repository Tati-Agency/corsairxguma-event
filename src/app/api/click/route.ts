import { NextRequest, NextResponse } from "next/server";
import { getAppwrite } from "@/lib/appwrite";
import { APPWRITE, EVENT, SHOPEE_LINKS } from "@/lib/config";
import { getClientIp, hashIdentity, isBot } from "@/lib/ua";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Chỉ nhận id nằm trong danh sách link đã biết — endpoint này public nên nếu
 * không chặn thì bất kỳ ai cũng bơm được id rác vào bảng thống kê.
 */
const ALLOWED_IDS = new Set<string>(SHOPEE_LINKS.map((l) => l.id));

interface ClickBody {
  sessionId?: string;
  buttonId?: string;
}

/**
 * Ghi 1 lượt bấm link Shopee.
 *
 * Khác `/api/visit` ở chỗ KHÔNG dedupe theo session: mỗi lần bấm là 1 row,
 * vì mục đích là đếm tổng số lượt bấm. Việc chống spam dựa vào rate limit
 * theo IP.
 */
export async function POST(req: NextRequest) {
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (isBot(ua)) return NextResponse.json({ ok: true, ignored: "bot" });

    const ip = getClientIp(req.headers);
    // 60 lượt bấm / cửa sổ — rộng rãi cho người dùng thật, chặn bot bơm số.
    if (!rateLimit(`click:${ip}`, 60)) {
      return NextResponse.json({ ok: true, ignored: "rate_limited" });
    }

    const body = (await req.json().catch(() => ({}))) as ClickBody;
    const buttonId = typeof body.buttonId === "string" ? body.buttonId : "";
    if (!ALLOWED_IDS.has(buttonId)) {
      return NextResponse.json({ ok: false, error: "unknown_button" }, { status: 400 });
    }

    const sessionId =
      typeof body.sessionId === "string" && body.sessionId.length <= 64
        ? body.sessionId
        : "";

    const { tablesDB } = getAppwrite();

    await tablesDB.createRow(APPWRITE.databaseId, APPWRITE.colClicks, "unique()", {
      event_id: EVENT.slug,
      button_id: buttonId,
      session_id: sessionId,
      session_hash: hashIdentity(ip, ua),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[click]", err);
    // Analytics không bao giờ được làm hỏng trải nghiệm của người dùng
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}
