/**
 * Che (mask) thông tin cá nhân cho role STAFF.
 *
 * QUAN TRỌNG: các hàm này chỉ được gọi ở SERVER (API route). Nếu che ở client
 * thì staff mở DevTools là đọc được dữ liệu gốc.
 *
 * Quy ước số dấu * là cố định theo từng loại trường (theo spec):
 *   tên     : 3 ký tự đầu + ****** + từ cuối      Dương Anh Minh -> Dươ****** Minh
 *   SĐT     : 3 số đầu + ****** + 3 số cuối       0123123123     -> 012******123
 *   email   : 3 ký tự đầu + ***** + 5 ký tự cuối  abcde@gmail.com -> abc*****l.com
 *   địa chỉ : 5 ký tự đầu + ********* + 6 ký tự cuối
 *             92 Võ Nguyên Giáp, Phường A, Hồ Chí Minh -> 92 Võ*********í Minh
 */

const stars = (n: number) => "*".repeat(n);

/** Dương Anh Minh -> Dươ****** Minh */
export function maskName(value?: string | null): string {
  const s = (value ?? "").trim();
  if (!s) return "";
  // Tên quá ngắn thì che hết, tránh lộ gần như toàn bộ
  if (s.length <= 6) return stars(6);
  const lastWord = s.split(/\s+/).pop() ?? "";
  return `${s.slice(0, 3)}${stars(6)} ${lastWord}`;
}

/** 0123123123 -> 012******123 */
export function maskPhone(value?: string | null): string {
  const s = (value ?? "").replace(/\s/g, "");
  if (!s) return "";
  if (s.length <= 6) return stars(6);
  return `${s.slice(0, 3)}${stars(6)}${s.slice(-3)}`;
}

/** abcde@gmail.com -> abc*****l.com */
export function maskEmail(value?: string | null): string {
  const s = (value ?? "").trim();
  if (!s) return "";
  if (s.length <= 8) return stars(5);
  return `${s.slice(0, 3)}${stars(5)}${s.slice(-5)}`;
}

/** "92 Võ Nguyên Giáp, Phường A, Hồ Chí Minh" -> "92 Võ*********í Minh" */
export function maskAddress(value?: string | null): string {
  const s = (value ?? "").trim();
  if (!s) return "";
  if (s.length <= 11) return stars(9);
  return `${s.slice(0, 5)}${stars(9)}${s.slice(-6)}`;
}

/**
 * Chỉ giữ phần NGÀY của mốc thời gian, bỏ giờ/phút/giây.
 * Trả về "YYYY-MM-DD" (cắt thẳng từ ISO, không qua Date để tránh lệch múi giờ).
 */
export function dateOnly(value?: string | null): string {
  const s = (value ?? "").trim();
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/**
 * Che 1 row check-in cho STAFF.
 *
 * Dùng danh sách TRẮNG (chỉ copy ra các field được phép) thay vì spread rồi
 * xoá — như vậy field mới thêm sau này sẽ mặc định bị ẩn, không lỡ lộ ra.
 * Staff vẫn thấy: mã tham gia, sản phẩm đã mua, ảnh hóa đơn (theo yêu cầu
 * để đối chiếu tại sự kiện).
 */
export function maskCheckinRow(row: Record<string, unknown>) {
  return {
    $id: row.$id,
    player_code: row.player_code,
    full_name: maskName(row.full_name as string),
    phone: maskPhone(row.phone as string),
    email: maskEmail(row.email as string),
    address: maskAddress(row.address as string),
    purchased_skus: row.purchased_skus,
    photo_file_id: row.photo_file_id,
    photo_file_ids: row.photo_file_ids,
    $createdAt: dateOnly(row.$createdAt as string),
  };
}
