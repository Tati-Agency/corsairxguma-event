import { getAppwrite } from "@/lib/appwrite";
import { APPWRITE } from "@/lib/config";
import { Query } from "node-appwrite";

/** Fetch every doc of a collection with pagination (1000/page Appwrite cap). */
export async function listAllDocs(
  collectionId: string,
  queries: string[] = []
): Promise<Record<string, unknown>[]> {
  const { databases } = getAppwrite();
  const out: Record<string, unknown>[] = [];
  let offset = 0;
  for (;;) {
    const res = await databases.listDocuments(APPWRITE.databaseId, collectionId, [
      ...queries,
      Query.limit(1000),
      Query.offset(offset),
    ]);
    out.push(...(res.documents as unknown as Record<string, unknown>[]));
    if (out.length >= res.total) break;
    offset += 1000;
  }
  return out;
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
