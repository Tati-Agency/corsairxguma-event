"use client";

/** Session-scoped analytics tracking. Fires once per session; silent on failure. */

const SESSION_KEY = "cxg_session_id";
const TRACKED_KEY = "cxg_tracked";

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function trackPageView(): void {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(TRACKED_KEY)) return;

  try {
    sessionStorage.setItem(TRACKED_KEY, "1");
    const payload = JSON.stringify({
      sessionId: getSessionId(),
      referrer: document.referrer || "direct",
      path: location.pathname,
    });
    // keepalive: the request survives page navigation away
    fetch("/api/visit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // analytics must never break the page
  }
}

/**
 * Ghi nhận 1 lượt bấm nút. KHÁC `trackPageView`: không có guard "mỗi session
 * 1 lần" vì cần đếm ĐỦ số lần bấm. Cố ý không await — không được chặn việc
 * mở link Shopee của người dùng.
 */
export function trackClick(buttonId: string): void {
  if (typeof window === "undefined") return;

  try {
    fetch("/api/click", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: getSessionId(), buttonId }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // analytics must never break the page
  }
}
