import { getAppwrite } from "@/lib/appwrite";
import { APPWRITE } from "@/lib/config";
import { getGroup } from "./groups";
import { Query } from "node-appwrite";

/** Fetch every doc of a collection with pagination (1000/page Appwrite cap). */
export async function listAllDocs(
  collectionId: string,
  queries: string[] = []
): Promise<Record<string, unknown>[]> {
  const { tablesDB } = getAppwrite();
  const out: Record<string, unknown>[] = [];
  let offset = 0;
  for (;;) {
    const res = await tablesDB.listRows(APPWRITE.databaseId, collectionId, [
      ...queries,
      Query.limit(1000),
      Query.offset(offset),
    ]);
    out.push(...(res.rows as unknown as Record<string, unknown>[]));
    if (out.length >= res.total) break;
    offset += 1000;
  }
  return out;
}

/**
 * Query lọc theo 1 trong 5 danh sách đăng ký (xem lib/groups.ts).
 * - 1 nhóm OR  → Query.contains
 * - nhiều nhóm → Query.and([...]) (phải mua ĐỦ các SKU)
 * - nhóm "all" → không lọc
 */
export function groupQueries(group: string | null | undefined): string[] {
  const { orGroups } = getGroup(group);
  if (orGroups.length === 0) return [];

  const orParts = orGroups.map((skus) =>
    skus.length === 1
      ? Query.contains("purchased_skus", skus[0])
      : Query.or(skus.map((sku) => Query.contains("purchased_skus", sku)))
  );

  return orParts.length === 1 ? [orParts[0]] : [Query.and(orParts)];
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const esc = (val: unknown) => {
    const s = String(val ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.join(",");
  const body = rows.map((r) => columns.map((c) => esc(r[c])).join(",")).join("\n");
  // BOM so Excel renders UTF-8 (Vietnamese names) correctly
  return "\uFEFF" + header + "\n" + body;
}
