/**
 * Event configuration — single source of truth for the active event.
 * For future multi-event support: this maps slug → event row in Appwrite.
 */
export const EVENT = {
  slug: process.env.NEXT_PUBLIC_EVENT_SLUG ?? "corsair-guma-2026",
  title: "CORSAIR × GUMAYUSI",
  subtitle: "GUMA COLLECTION 2026",
  date: "25.10.2026",
  time: "09:00 — 18:00",
  venue: "Sảnh NEXT250 - Nina Next Space, 180/1 Nguyễn Tất Thành, Phường Xóm Chiếu, Thành phố Hồ Chí Minh",
} as const;

/**
 * Mốc thời gian kết thúc countdown = lúc mở cổng pre-order: 22/09/2026 00:00.
 * Dùng chung giữa Countdown.tsx và Register.tsx để đồng bộ
 * "khi nào nút đăng ký được mở" + khi nào video YouTube tự hiện.
 *
 * ⚠️ PHỤ THUỘC MÚI GIỜ CỦA NƠI GỌI — chỉ được đọc ở CLIENT.
 * `new Date(y, m, d, ...)` tính theo TZ của máy chạy code:
 *   - Trình duyệt người dùng (VN, UTC+7) → đúng 0h 22/09 giờ VN
 *   - Server Vercel (UTC)               → 22/09 00:00 UTC = 7h sáng giờ VN
 * Lệch 7 tiếng. Hiện tại an toàn vì mọi chỗ đọc đều nằm trong client
 * component, và phần hiển thị không có số nào phụ thuộc thời gian được
 * server-render. Nếu sau này đọc hằng số này Ở SERVER (vd chặn submit sớm
 * trong /api/checkin) thì PHẢI đổi sang mốc UTC tường minh trước
 * (Date.UTC(2026, 8, 21, 17, 0, 0)) — nếu không sẽ chặn nhầm người dùng
 * thật suốt 7 tiếng đầu.
 */
export const EVENT_END_MS = new Date(2026, 8, 22, 0, 0, 0).getTime();

/**
 * 3 link Shopee — gian hàng chính hãng CORSAIR (VN).
 * CHỈ hiện ở đồng hồ đếm ngược SAU khi đồng hồ về 0, đúng thể lệ ghi
 * "link mở ở đồng hồ đếm ngược vào 0h 22/09". Trước mốc đó không render nên
 * link không bị lộ khi sản phẩm chưa mở bán.
 *
 * `id` là khoá ghi vào bảng click_logs mỗi lượt bấm → cũng là khoá hiển thị
 * trong bảng thống kê ở /admin. ĐỔI `id` sẽ làm số liệu cũ tách thành dòng mới.
 */
export const SHOPEE_LINKS = [
  { id: "shopee_keyboard", label: "Bàn phím", url: "https://vn.shp.ee/cinkfF1J" },
  { id: "shopee_mouse", label: "Chuột", url: "https://vn.shp.ee/qrDmZXC2" },
  { id: "shopee_mousepad", label: "Lót chuột", url: "https://vn.shp.ee/E61wLrCT" },
] as const;

export type ShopeeLinkId = (typeof SHOPEE_LINKS)[number]["id"];

/** Tra cứu link Shopee theo id — dùng cho card sản phẩm ở EventJourney. */
export const SHOPEE_BY_ID = Object.fromEntries(
  SHOPEE_LINKS.map((l) => [l.id, l])
) as Record<ShopeeLinkId, (typeof SHOPEE_LINKS)[number]>;

/**
 * Tên chương trình đăng ký tham gia — dành riêng cho chủ nhân
 * sản phẩm GUMA Collection (xác minh bằng hóa đơn mua hàng).
 */
export const CAMPAIGN = {
  title: "GUMA REGISTER",
  codeLabel: "Mã tham gia",
  materialLabel: "Hóa đơn mua hàng",
} as const;

/** Prefix used for player codes, e.g. GUMA-8F3K */
export const PLAYER_CODE_PREFIX = "GUMA";

export const APPWRITE = {
  endpoint: process.env.APPWRITE_ENDPOINT ?? "",
  projectId: process.env.APPWRITE_PROJECT_ID ?? "",
  apiKey: process.env.APPWRITE_API_KEY ?? "",
  databaseId: process.env.APPWRITE_DATABASE_ID ?? "event_db",
  colEvents: process.env.APPWRITE_COLLECTION_EVENTS ?? "events",
  colCheckins: process.env.APPWRITE_COLLECTION_CHECKINS ?? "checkins",
  colVisits: process.env.APPWRITE_COLLECTION_VISITS ?? "visit_logs",
  colClicks: process.env.APPWRITE_COLLECTION_CLICKS ?? "click_logs",
  bucketPhotos: process.env.APPWRITE_BUCKET_PHOTOS ?? "event-photos",
} as const;
