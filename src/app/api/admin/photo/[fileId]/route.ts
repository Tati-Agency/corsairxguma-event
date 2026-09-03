import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getAppwrite } from "@/lib/appwrite";
import { APPWRITE } from "@/lib/config";

export const runtime = "nodejs";

/** Proxies a private photo from Appwrite Storage using the server-side API key. */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ fileId: string }> }
) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { fileId } = await ctx.params;
  if (!/^[a-zA-Z0-9._-]{5,64}$/.test(fileId)) {
    return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
  }

  try {
    const { storage } = getAppwrite();
    const file = await storage.getFileDownload(APPWRITE.bucketPhotos, fileId);
    const buffer = Buffer.from(file as unknown as ArrayBuffer);
    return new NextResponse(buffer, {
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("[admin/photo]", err);
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
}
