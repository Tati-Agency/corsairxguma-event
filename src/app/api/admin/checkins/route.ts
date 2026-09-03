import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getAppwrite } from "@/lib/appwrite";
import { APPWRITE } from "@/lib/config";
import { Query } from "node-appwrite";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const sp = req.nextUrl.searchParams;
  const event = sp.get("event") ?? "";
  const q = (sp.get("q") ?? "").trim();
  const limit = Math.min(Number(sp.get("limit") ?? 50), 100);
  const offset = Math.max(Number(sp.get("offset") ?? 0), 0);

  try {
    const queries: string[] = [];
    if (event) queries.push(Query.equal("event_id", event));
    if (q) {
      // Appwrite v1.6+ supports search on string attributes if index exists
      queries.push(Query.search("full_name", q));
    }

    const { databases } = getAppwrite();
    const res = await databases.listDocuments(
      APPWRITE.databaseId,
      APPWRITE.colCheckins,
      [...queries, Query.orderDesc("$createdAt"), Query.limit(limit), Query.offset(offset)]
    );

    return NextResponse.json({
      ok: true,
      total: res.total,
      documents: res.documents,
    });
  } catch (err) {
    console.error("[admin/checkins]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
