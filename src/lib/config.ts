/**
 * Event configuration — single source of truth for the active event.
 * For future multi-event support: this maps slug → event row in Appwrite.
 */
export const EVENT = {
  slug: process.env.NEXT_PUBLIC_EVENT_SLUG ?? "corsair-guma-2026",
  title: "CORSAIR × GUMAYUSI",
  subtitle: "EVENT 2026",
  date: "25.10.2026",
  time: "09:00 — 18:00",
  venue: "Sảnh NEXT250 - Nina Next Space, 180/1 Nguyễn Tất Thành, Phường Xóm Chiếu, Thành phố Hồ Chí Minh",
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
  bucketPhotos: process.env.APPWRITE_BUCKET_PHOTOS ?? "event-photos",
} as const;
