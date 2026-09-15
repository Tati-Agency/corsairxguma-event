import { NextRequest, NextResponse } from "next/server";
import { getRole, unauthorized } from "@/lib/admin-auth";
import { getAppwrite } from "@/lib/appwrite";
import { maskCheckinRow } from "@/lib/mask";
import { groupQueries } from "@/lib/admin-data";
import { APPWRITE } from "@/lib/config";
import { Query } from "node-appwrite";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const role = getRole(req);
  if (!role) return unauthorized();

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
      // Staff chỉ được tìm theo mã tham gia: nếu cho tìm theo tên/SĐT/email thì
      // họ có thể dò dần để xác nhận một người có trong danh sách hay không
      // (dù kết quả đã bị che) — đó vẫn là rò rỉ thông tin.
      const fields =
        role === "staff"
          ? ["player_code"]
          : ["full_name", "phone", "email", "player_code"];
      // Appwrite yêu cầu Query.or() có ÍT NHẤT 2 điều kiện → với 1 field
      // (trường hợp staff) thì thêm thẳng Query.contains, không bọc or.
      queries.push(
        fields.length === 1
          ? Query.contains(fields[0], q)
          : Query.or(fields.map((f) => Query.contains(f, q)))
      );
    }

    const { tablesDB } = getAppwrite();
    const res = await tablesDB.listRows(
      APPWRITE.databaseId,
      APPWRITE.colCheckins,
      [...queries, Query.orderDesc("$createdAt"), Query.limit(limit), Query.offset(offset)]
    );

    // Staff: che thông tin cá nhân NGAY Ở SERVER (không để client tự che)
    const documents =
      role === "staff"
        ? res.rows.map((r) => maskCheckinRow(r as unknown as Record<string, unknown>))
        : res.rows;

    return NextResponse.json({
      ok: true,
      role,
      total: res.total,
      documents,
    });
  } catch (err) {
    console.error("[admin/checkins]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
