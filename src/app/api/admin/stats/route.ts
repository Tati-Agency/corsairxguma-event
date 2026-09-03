import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listAllDocs } from "@/lib/admin-data";
import { APPWRITE } from "@/lib/config";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const event = req.nextUrl.searchParams.get("event") ?? "";
  try {
    const visits = await listAllDocs(APPWRITE.colVisits);
    const checkins = await listAllDocs(APPWRITE.colCheckins);

    const evVisits = event ? visits.filter((d) => d.event_id === event) : visits;
    const evCheckins = event
      ? checkins.filter((d) => d.event_id === event)
      : checkins;

    // ---- Visit analytics ----
    const byDevice: Record<string, number> = { mobile: 0, tablet: 0, desktop: 0 };
    const byBrowser: Record<string, number> = {};
    const byOs: Record<string, number> = {};
    const byReferrer: Record<string, number> = {};
    const uniqueSessions = new Set<string>();

    for (const v of evVisits) {
      const device = String(v.device ?? "desktop");
      byDevice[device] = (byDevice[device] ?? 0) + 1;
      const browser = String(v.browser ?? "Other");
      byBrowser[browser] = (byBrowser[browser] ?? 0) + 1;
      const os = String(v.os ?? "Other");
      byOs[os] = (byOs[os] ?? 0) + 1;
      const ref = String(v.referrer ?? "direct") || "direct";
      byReferrer[ref] = (byReferrer[ref] ?? 0) + 1;
      if (v.session_hash) uniqueSessions.add(String(v.session_hash));
    }

    // ---- Check-in timeline by hour ----
    const byHour: Record<string, number> = {};
    for (const c of evCheckins) {
      const createdAt = String(c.$createdAt ?? "");
      const hour = createdAt.slice(0, 13) + ":00";
      byHour[hour] = (byHour[hour] ?? 0) + 1;
    }

    const totalVisits = evVisits.length;
    const totalCheckins = evCheckins.length;

    return NextResponse.json({
      ok: true,
      stats: {
        totalVisits,
        uniqueVisits: uniqueSessions.size,
        totalCheckins,
        conversionRate:
          totalVisits > 0
            ? Math.round((totalCheckins / totalVisits) * 1000) / 10
            : 0,
        byDevice,
        byBrowser,
        byOs,
        byReferrer,
        byHour,
      },
    });
  } catch (err) {
    console.error("[admin/stats]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
