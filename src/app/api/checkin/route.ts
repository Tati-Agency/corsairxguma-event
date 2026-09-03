import { NextRequest, NextResponse } from "next/server";
import { getAppwrite } from "@/lib/appwrite";
import { APPWRITE, EVENT, PLAYER_CODE_PREFIX } from "@/lib/config";
import { getClientIp, hashIdentity, isBot } from "@/lib/ua";
import { rateLimit } from "@/lib/rate-limit";
import { Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";

export const runtime = "nodejs";

// ---- Validation ----
const MAX_PHOTO_BYTES = 1 * 1024 * 1024; // client compresses to ~300KB, hard cap 1MB
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

    const form = await req.formData();
    const fullName = String(form.get("fullName") ?? "").trim();
    const phoneRaw = String(form.get("phone") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const consent = form.get("consent") === "true";
    const photo = form.get("photo");

    if (!NAME_RE.test(fullName)) return errorJson("invalid_name", 400, "fullName");

    const phone = phoneRaw.replace(/[\s.\-()]/g, "");
    if (!VN_PHONE_RE.test(phone)) return errorJson("invalid_phone", 400, "phone");

    if (!EMAIL_RE.test(email) || email.length > 120)
      return errorJson("invalid_email", 400, "email");

    if (!consent) return errorJson("consent_required", 400, "consent");

    if (!(photo instanceof File)) return errorJson("photo_required", 400, "photo");
    if (photo.size > MAX_PHOTO_BYTES) return errorJson("photo_too_large", 400, "photo");
    if (!ALLOWED_PHOTO_TYPES.includes(photo.type))
      return errorJson("photo_invalid_type", 400, "photo");

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

    // ---- Upload photo ----
    const photoBuffer = Buffer.from(await photo.arrayBuffer());
    const ext = photo.type === "image/png" ? "png" : "jpg";
    const file = await storage.createFile(
      APPWRITE.bucketPhotos,
      "unique()",
      InputFile.fromBuffer(photoBuffer, "photo.jpg")
    );

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
        photo_file_id: file.$id,
        session_hash: hashIdentity(ip, ua),
        consent: true,
        user_agent: ua.slice(0, 250),
      }
    );

    return NextResponse.json({
      ok: true,
      playerCode: `${PLAYER_CODE_PREFIX}-${playerCode}`,
      fullName,
      createdAt: doc.createdAt,
    });
  } catch (err) {
    console.error("[checkin]", err);
    return errorJson("server_error", 500);
  }
}
