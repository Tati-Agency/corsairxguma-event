import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listAllDocs, toCsv } from "@/lib/admin-data";
import { APPWRITE } from "@/lib/config";
import { Query } from "node-appwrite";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") ?? "checkins";
  const event = sp.get("event") ?? "";

  try {
    if (type === "checkins") {
      const queries = event ? [Query.equal("event_id", event)] : [];
      const rows = await listAllDocs(APPWRITE.colCheckins, queries);
      const csv = toCsv(rows, [
        "player_code",
        "full_name",
        "phone",
        "email",
        "event_id",
        "$createdAt",
      ]);
      return new NextResponse(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="checkins-${event || "all"}.csv"`,
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
