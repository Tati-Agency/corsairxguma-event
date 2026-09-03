import "server-only";
import { Client, TablesDB, Storage } from "node-appwrite";
import { APPWRITE } from "./config";

let cached: { tablesDB: TablesDB; storage: Storage } | null = null;

/** Server-side Appwrite client — NEVER import this from client components. */
export function getAppwrite() {
  if (!APPWRITE.endpoint || !APPWRITE.projectId || !APPWRITE.apiKey) {
    throw new Error(
      "Appwrite is not configured. Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY in .env.local"
    );
  }
  if (cached) return cached;

  const client = new Client()
    .setEndpoint(APPWRITE.endpoint)
    .setProject(APPWRITE.projectId)
    .setKey(APPWRITE.apiKey);

  cached = {
    tablesDB: new TablesDB(client),
    storage: new Storage(client),
  };
  return cached;
}
