/**
 * Định nghĩa 5 danh sách đăng ký dùng cho /admin.
 *
 * 4 danh sách đầu dùng để quay số (luckydraw), danh sách "all" để quản lý số liệu.
 * Lọc theo kiểu "CÓ chứa": ai mua nhiều món sẽ xuất hiện ở NHIỀU danh sách
 * (vd mua chuột + bàn phím thì có mặt ở cả "mouse", "keyboard" và
 * "mouse_or_keyboard").
 *
 * File này là dữ liệu thuần (không import server-only) nên dùng được cho cả
 * client (dropdown, tab) lẫn server (dựng query Appwrite).
 */

/** SKU gốc của 4 sản phẩm GUMAYUSI Collection. */
export const SKU = {
  keyboard: "CH-91E931G-NA", // VANGUARD PRO 96
  mouse: "CH-931G20C-WW", // SABRE v2 PRO CF
  mousepadStarry: "CH-941D17B-WW", // MM 2XL STARRY NIGHT
  mousepadBlkGld: "CH-941D17A-WW", // MM 2XL BLACK/GOLD
} as const;

/** Tên hiển thị của từng SKU (dùng cho bảng admin). */
export const SKU_LABEL: Record<string, string> = {
  [SKU.keyboard]: "VANGUARD PRO 96",
  [SKU.mouse]: "SABRE v2 PRO CF",
  [SKU.mousepadStarry]: "MM 2XL STARRY NIGHT",
  [SKU.mousepadBlkGld]: "MM 2XL BLACK/GOLD",
};

export type GroupKey =
  | "all"
  | "keyboard"
  | "mouse"
  | "mousepad"
  | "mouse_or_keyboard";

export type GroupSpec = {
  key: GroupKey;
  /** Nhãn hiển thị trên tab / dropdown. */
  label: string;
  /** Nhãn ngắn cho dropdown xuất CSV. */
  short: string;
  /**
   * Điều kiện lọc theo SKU đã mua, viết dạng: AND của các nhóm OR.
   * - `[]` → không lọc (lấy tất cả).
   * - `[["A"]]` → có chứa A.
   * - `[["A", "B"]]` → có chứa A HOẶC B.
   * - `[["A"], ["B"]]` → có chứa A VÀ B.
   */
  orGroups: string[][];
};

export const GROUPS: GroupSpec[] = [
  {
    key: "all",
    label: "Tổng đăng ký",
    short: "Tổng đăng ký",
    orGroups: [],
  },
  {
    key: "keyboard",
    label: "Bàn phím",
    short: "Bàn phím",
    orGroups: [[SKU.keyboard]],
  },
  {
    key: "mouse",
    label: "Chuột",
    short: "Chuột",
    orGroups: [[SKU.mouse]],
  },
  {
    key: "mousepad",
    label: "Lót chuột",
    short: "Lót chuột (2 mã MM 2XL)",
    orGroups: [[SKU.mousepadStarry, SKU.mousepadBlkGld]],
  },
  {
    // HỢP (hoặc), KHÔNG phải giao: thể lệ lucky draw đặc biệt ghi
    // "bàn phím HOẶC chuột" → 1 nhóm OR chứa cả 2 SKU.
    // (Tên key cũ là "mouse_keyboard" gây hiểu nhầm là giao.)
    key: "mouse_or_keyboard",
    label: "Chuột hoặc Bàn phím",
    short: "Chuột hoặc Bàn phím",
    orGroups: [[SKU.mouse, SKU.keyboard]],
  },
];

export const DEFAULT_GROUP: GroupKey = "all";

/** Lấy spec theo key, fallback về "all" nếu key không hợp lệ. */
export function getGroup(key: string | null | undefined): GroupSpec {
  return GROUPS.find((g) => g.key === key) ?? GROUPS[0];
}

/** Tên file CSV gợi ý cho từng nhóm. */
export function groupFileSuffix(key: GroupKey): string {
  return key;
}
