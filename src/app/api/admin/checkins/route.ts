import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getAppwrite } from "@/lib/appwrite";
import { groupQueries } from "@/lib/admin-data";
import { APPWRITE } from "@/lib/config";
import { Query } from "node-appwrite";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const sp = req.nextUrl.searchParams;
  const event = sp.get("event") ?? "";
  const q = (sp.get("q") ?? "").trim();
  /** 1 trong 5 danh sách: all | keyboard | mouse | mousepad | mouse_keyboard */
  const group = sp.get("group") ?? "all";
  const limit = Math.min(Number(sp.get("limit") ?? 50), 100);
  const offset = Math.max(Number(sp.get("offset") ?? 0), 0);

  try {
    const queries: string[] = [];
    if (event) queries.push(Query.equal("event_id", event));
    // Lọc theo danh sách (theo SKU đã mua)
    queries.push(...groupQueries(group));
    if (q) {
      // Tìm đa trường: tên, SĐT, email, player code
      queries.push(
        Query.or([
          Query.contains("full_name", q),
          Query.contains("phone", q),
          Query.contains("email", q),
          Query.contains("player_code", q),
        ])
      );
    }

    const { tablesDB } = getAppwrite();
    const res = await tablesDB.listRows(
      APPWRITE.databaseId,
      APPWRITE.colCheckins,
      [...queries, Query.orderDesc("$createdAt"), Query.limit(limit), Query.offset(offset)]
    );

    return NextResponse.json({
      ok: true,
      total: res.total,
      documents: res.rows,
    });
  } catch (err) {
    console.error("[admin/checkins]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
