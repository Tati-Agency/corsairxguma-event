import { NextRequest, NextResponse } from "next/server";
import { getAppwrite } from "@/lib/appwrite";
import { APPWRITE, EVENT, PLAYER_CODE_PREFIX } from "@/lib/config";
import { getClientIp, hashIdentity, isBot } from "@/lib/ua";
import { rateLimit } from "@/lib/rate-limit";
import { Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

export const runtime = "nodejs";

// ---- Validation ----
const MAX_PHOTOS_PER_CHECKIN = 3;
const HARD_MAX_BYTES_PER_PHOTO = 35 * 1024 * 1024; // 35MB/ảnh — chừa cho điện thoại chụp phân giải cao
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const NAME_RE = /^[\p{L}\p{M}'.\- ]{2,80}$/u;
const VN_PHONE_RE = /^0\d{8,10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars (0/O, 1/I)

function errorJson(error: string, status = 400, field?: string) {
  return NextResponse.json({ ok: false, error, field }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (isBot(ua)) return errorJson("forbidden", 403);

    const ip = getClientIp(req.headers);
    if (!rateLimit(`checkin:${ip}`, 8)) {
      return errorJson("too_many_requests", 429);
    }

    // Content-Type không phải multipart (bot/scanner POST JSON chẳng hạn) làm
    // formData() ném lỗi. Đây là lỗi phía client nên trả 400, không để rơi vào
    // catch chung rồi thành 500 (làm rác log + tăng error rate vô ích).
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return errorJson("invalid_request", 400);
    }
    const fullName = String(form.get("fullName") ?? "").trim();
    const phoneRaw = String(form.get("phone") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const address = String(form.get("address") ?? "").trim();
    const consent = form.get("consent") === "true";
    const invoices = form.getAll("invoices").filter((v): v is File => v instanceof File);
    const purchasedSkusRaw = form.getAll("purchasedSkus").map((v) => String(v)).filter(Boolean);
    // Dedup + giới hạn 4 SKU (đúng 4 sp GUMA hiện có)
    const purchasedSkus = Array.from(new Set(purchasedSkusRaw)).slice(0, 4);

    if (!NAME_RE.test(fullName)) return errorJson("invalid_name", 400, "fullName");

    const phone = phoneRaw.replace(/[\s.\-()]/g, "");
    if (!VN_PHONE_RE.test(phone)) return errorJson("invalid_phone", 400, "phone");

    if (!EMAIL_RE.test(email) || email.length > 120)
      return errorJson("invalid_email", 400, "email");

    if (address.length < 5 || address.length > 512)
      return errorJson("invalid_address", 400, "address");

    if (!consent) return errorJson("consent_required", 400, "consent");

    if (purchasedSkus.length === 0)
      return errorJson("purchased_required", 400, "purchased");

    if (invoices.length === 0) return errorJson("invoice_required", 400, "invoice");
    if (invoices.length > MAX_PHOTOS_PER_CHECKIN)
      return errorJson("invoice_too_many", 400, "invoice");
    for (const f of invoices) {
      if (f.size > HARD_MAX_BYTES_PER_PHOTO)
        return errorJson("invoice_too_large_per_file", 400, "invoice");
      if (!ALLOWED_PHOTO_TYPES.includes(f.type))
        return errorJson("invoice_invalid_type", 400, "invoice");
    }

    const { tablesDB, storage } = getAppwrite();

    // ---- Dedupe: one check-in per phone per event ----
    const dup = await tablesDB.listRows(
      APPWRITE.databaseId,
      APPWRITE.colCheckins,
      [
        Query.equal("event_id", EVENT.slug),
        Query.equal("phone", phone),
        Query.limit(1),
      ]
    );
    if (dup.total > 0) {
      return NextResponse.json(
        { ok: false, error: "already_checked_in" },
        { status: 409 }
      );
    }

    // ---- Upload từng invoice lên Storage, thu thập file IDs ----
    const photoFileIds: string[] = [];
    for (let i = 0; i < invoices.length; i++) {
      const buffer = Buffer.from(await invoices[i].arrayBuffer());
      const file = await storage.createFile(
        APPWRITE.bucketPhotos,
        "unique()",
        InputFile.fromBuffer(buffer, `invoice-${i + 1}.jpg`)
      );
      photoFileIds.push(file.$id);
    }

    // ---- Generate unique player code ----
    let playerCode = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      const bytes = new Uint8Array(4);
      crypto.getRandomValues(bytes);
      let candidate = "";
      for (let i = 0; i < 4; i++)
        candidate += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
      const taken = await tablesDB.listRows(
        APPWRITE.databaseId,
        APPWRITE.colCheckins,
        [
          Query.equal("event_id", EVENT.slug),
          Query.equal("player_code", candidate),
          Query.limit(1),
        ]
      );
      if (taken.total === 0) {
        playerCode = candidate;
        break;
      }
    }
    if (!playerCode) return errorJson("server_busy", 500);

    // ---- Persist ----
    const doc = await tablesDB.createRow(
      APPWRITE.databaseId,
      APPWRITE.colCheckins,
      "unique()",
      {
        event_id: EVENT.slug,
        player_code: playerCode,
        full_name: fullName,
        phone,
        email,
        address,
        photo_file_id: photoFileIds[0] ?? "",
        photo_file_ids: photoFileIds,
        purchased_skus: purchasedSkus,
        session_hash: hashIdentity(ip, ua),
        consent: true,
        user_agent: ua.slice(0, 250),
      }
    );

    return NextResponse.json({
      ok: true,
      playerCode: `${PLAYER_CODE_PREFIX}-${playerCode}`,
      fullName,
      phone,
      email,
      createdAt: doc.$createdAt,
    });
  } catch (err) {
    console.error("[checkin]", err);
    return errorJson("server_error", 500);
  }
}
