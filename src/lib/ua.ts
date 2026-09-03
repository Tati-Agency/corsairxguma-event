import { createHash } from "crypto";

export type DeviceKind = "mobile" | "tablet" | "desktop";
export interface UaInfo {
  device: DeviceKind;
  browser: string;
  os: string;
}

const BOT_PATTERN =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|lighthouse|headless|curl|wget|python-requests/i;

export function isBot(ua: string): boolean {
  return BOT_PATTERN.test(ua);
}

/** Lightweight UA classification — no external dependency. */
export function parseUa(ua: string): UaInfo {
  const s = ua.toLowerCase();

  let os = "Other";
  if (s.includes("windows")) os = "Windows";
  else if (s.includes("android")) os = "Android";
  else if (s.includes("iphone") || s.includes("ipod")) os = "iOS";
  else if (s.includes("ipad")) os = "iPadOS";
  else if (s.includes("mac os")) os = "macOS";
  else if (s.includes("linux")) os = "Linux";

  let browser = "Other";
  if (s.includes("edg/")) browser = "Edge";
  else if (s.includes("samsungbrowser")) browser = "Samsung Internet";
  else if (s.includes("opr/") || s.includes("opera")) browser = "Opera";
  else if (s.includes("firefox")) browser = "Firefox";
  else if (s.includes("chrome") || s.includes("crios")) browser = "Chrome";
  else if (s.includes("safari")) browser = "Safari";

  const isTablet =
    s.includes("ipad") || s.includes("tablet");

  let device: DeviceKind = "desktop";
  if (s.includes("mobile") && !isTablet) device = "mobile";
  else if (isTablet) device = "tablet";

  return { device, browser, os };
}

/** Privacy-safe hash: we never store the raw IP, only a truncated digest. */
export function hashIdentity(ip: string, ua: string): string {
  const salt = process.env.IDENTITY_SALT ?? "corsair-guma-salt";
  return createHash("sha256")
    .update(`${ip}|${ua}|${salt}`)
    .digest("hex")
    .slice(0, 24);
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}
