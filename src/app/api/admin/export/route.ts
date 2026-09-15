import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { groupQueries, listAllDocs, toCsv } from "@/lib/admin-data";
import { APPWRITE } from "@/lib/config";
import { Query } from "node-appwrite";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") ?? "register";
  const event = sp.get("event") ?? "";
  /** 1 trong 5 danh sách: all | keyboard | mouse | mousepad | mouse_keyboard */
  const group = sp.get("group") ?? "all";

  try {
    // "register" là tên mới (form đăng ký); vẫn nhận "checkins" để không vỡ link cũ
    if (type === "register" || type === "checkins") {
      const queries = [
        ...(event ? [Query.equal("event_id", event)] : []),
        ...groupQueries(group),
      ];
      const rows = await listAllDocs(APPWRITE.colCheckins, queries);

      // CSV không có kiểu mảng → gộp mảng thành chuỗi, mỗi giá trị cách " | ".
      // photo_file_ids có thể trống với dữ liệu cũ → fallback về photo_file_id.
      const flat = rows.map((r) => {
        const photoIds =
          Array.isArray(r.photo_file_ids) && r.photo_file_ids.length > 0
            ? r.photo_file_ids
            : r.photo_file_id
              ? [r.photo_file_id]
              : [];
        return {
          ...r,
          purchased_skus: Array.isArray(r.purchased_skus)
            ? r.purchased_skus.join(" | ")
            : r.purchased_skus,
          invoice_photos: photoIds.join(" | "),
          invoice_photo_count: photoIds.length,
        };
      });

      const csv = toCsv(flat, [
        "player_code",
        "full_name",
        "phone",
        "email",
        "address",
        "purchased_skus",
        "invoice_photo_count",
        "invoice_photos",
        "event_id",
        "$createdAt",
      ]);

      return new NextResponse(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="register-${group}-${event || "all"}.csv"`,
        },
      });
    }

    if (type === "analytics") {
      const queries = event ? [Query.equal("event_id", event)] : [];
      const rows = await listAllDocs(APPWRITE.colVisits, queries);
      const csv = toCsv(rows, [
        "$createdAt",
        "event_id",
        "session_hash",
        "device",
        "browser",
        "os",
        "referrer",
      ]);
      return new NextResponse(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="analytics-${event || "all"}.csv"`,
        },
      });
    }

    return NextResponse.json({ ok: false, error: "unknown_type" }, { status: 400 });
  } catch (err) {
    console.error("[admin/export]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
