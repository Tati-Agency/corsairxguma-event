/**
 * Hiển thị thông tin địa lý suy ra từ IP (chỉ dùng ở admin).
 * Không import server-only nên dùng được trong client component.
 */

/** Mã 2 ký tự không hợp lệ hoặc rỗng. */
export function isEmptyGeoCode(code?: string): boolean {
  return !code || !/^[A-Za-z]{2}$/.test(code.trim());
}

/**
 * Tên quốc gia tiếng Việt từ mã ISO 3166-1 alpha-2.
 * Dùng Intl.DisplayNames có sẵn của trình duyệt/Node — không cần bảng tra cứu.
 *   countryName("VN") -> "Việt Nam"
 */
export function countryName(code?: string): string {
  const cc = (code ?? "").trim().toUpperCase();
  if (isEmptyGeoCode(cc)) return "Không xác định";
  try {
    return new Intl.DisplayNames(["vi"], { type: "region" }).of(cc) ?? cc;
  } catch {
    return cc;
  }
}

/**
 * Cờ quốc gia từ mã ISO (biến mỗi chữ cái thành "regional indicator symbol").
 *   countryFlag("VN") -> 🇻🇳
 * Lưu ý: Windows không render cờ, sẽ hiện 2 chữ cái VN — vẫn đọc được nên
 * luôn kèm tên quốc gia ở UI, không phụ thuộc mỗi cờ.
 */
export function countryFlag(code?: string): string {
  const cc = (code ?? "").trim().toUpperCase();
  if (isEmptyGeoCode(cc)) return "";
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
