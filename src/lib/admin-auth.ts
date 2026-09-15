import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * Phân quyền /admin bằng 2 key riêng (đều nằm trong env, không xuống bundle):
 *   ADMIN_KEY — quản lý, xem MỌI thứ
 *   STAFF_KEY — nhân sự, chỉ xem KPI + biểu đồ theo ngày và danh sách đã CHE
 *               thông tin cá nhân (xem src/lib/mask.ts)
 *
 * Key gửi qua header `x-admin-key`, hoặc query `?k=` cho trường hợp <img>
 * (thẻ ảnh không gửi được header). Route nào cần che dữ liệu thì PHẢI gọi
 * getRole() và tự che ở server — không được để client tự che.
 */
export type AdminRole = "admin" | "staff";

/** So sánh chuỗi theo thời gian hằng định (tránh timing attack). */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Key client gửi lên: ưu tiên header, fallback query `?k=`. */
function readKey(req: NextRequest): string | null {
  return req.headers.get("x-admin-key") ?? req.nextUrl.searchParams.get("k");
}

/** Vai trò ứng với key đã gửi, hoặc null nếu không hợp lệ. */
export function getRole(req: NextRequest): AdminRole | null {
  const provided = readKey(req);
  if (!provided) return null;

  const adminKey = process.env.ADMIN_KEY;
  if (adminKey && safeEqual(provided, adminKey)) return "admin";

  const staffKey = process.env.STAFF_KEY;
  if (staffKey && safeEqual(provided, staffKey)) return "staff";

  return null;
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

/**
 * Chấp nhận CẢ admin lẫn staff (route tự xử lý theo role).
 * Trả NextResponse 401 nếu key không hợp lệ, null nếu hợp lệ.
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  if (!process.env.ADMIN_KEY && !process.env.STAFF_KEY) {
    return NextResponse.json(
      { ok: false, error: "admin_key_not_configured" },
      { status: 401 }
    );
  }
  return getRole(req) ? null : unauthorized();
}
