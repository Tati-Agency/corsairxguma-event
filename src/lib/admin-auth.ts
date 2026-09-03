import { NextRequest, NextResponse } from "next/server";

/**
 * Admin auth: the admin page sends the shared key via `x-admin-key` header.
 * Image requests (<img> tags) cannot send headers, so they may pass the key
 * via the `k` query param instead. The key lives only in env vars —
 * never exposed to the public bundle.
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const expected = process.env.ADMIN_KEY;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "admin_key_not_configured" },
      { status: 401 }
    );
  }
  const headerKey = req.headers.get("x-admin-key");
  const paramKey = req.nextUrl.searchParams.get("k");
  if (headerKey !== expected && paramKey !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return null;
}
