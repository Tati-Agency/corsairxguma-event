"use client";

import { compressImage } from "./compress";

export interface CheckinPayload {
  fullName: string;
  phone: string;
  email: string;
  consent: boolean;
  photo: File;
}

export interface CheckinSuccess {
  ok: true;
  playerCode: string;
  fullName: string;
}

export interface CheckinFailure {
  ok: false;
  error: string;
  field?: string;
  retryable?: boolean;
}

export type CheckinResult = CheckinSuccess | CheckinFailure;

export const PASS_STORAGE_KEY = "cxg_event_pass";

export function savePassToLocal(pass: CheckinSuccess): void {
  try {
    localStorage.setItem(PASS_STORAGE_KEY, JSON.stringify(pass));
  } catch {
    // private mode — pass just won't persist
  }
}

export function loadPassFromLocal(): CheckinSuccess | null {
  try {
    const raw = localStorage.getItem(PASS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckinSuccess;
    return parsed?.ok && parsed.playerCode ? parsed : null;
  } catch {
    return null;
  }
}

const ERR_MESSAGE: Record<string, string> = {
  invalid_name: "Họ tên không hợp lệ (2–80 ký tự).",
  invalid_phone: "Số điện thoại không hợp lệ (VD: 09xx xxx xxx).",
  invalid_email: "Email không hợp lệ.",
  consent_required: "Bạn cần đồng ý cho việc lưu hình ảnh để tiếp tục.",
  photo_required: "Vui lòng chọn hoặc chụp một hình ảnh.",
  photo_too_large: "Ảnh quá lớn — hãy thử lại (tối đa ~1MB).",
  photo_invalid_type: "Định dạng ảnh không hỗ trợ (JPG/PNG/WEBP).",
  already_checked_in: "Số điện thoại này đã check-in rồi. Hãy liên hệ staff nếu cần hỗ trợ.",
  too_many_requests: "Bạn thao tác quá nhanh — thử lại sau ít phút.",
  server_error: "Hệ thống bận. Vui lòng thử lại.",
  server_busy: "Hệ thống bận. Vui lòng thử lại.",
  network: "Kết nối mạng không ổn định. Đang thử lại…",
};

export function errorMessage(code: string): string {
  return ERR_MESSAGE[code] ?? "Đã có lỗi xảy ra. Vui lòng thử lại.";
}

/**
 * Submit with retry + exponential backoff for transient failures
 * (weak venue Wi-Fi). Validation errors (4xx) fail fast without retry.
 */
export async function submitCheckin(
  payload: CheckinPayload,
  onStatus?: (msg: string, attempt: number) => void
): Promise<CheckinResult> {
  const MAX_ATTEMPTS = 4;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const form = new FormData();
    form.set("fullName", payload.fullName);
    form.set("phone", payload.phone);
    form.set("email", payload.email);
    form.set("consent", String(payload.consent));

    try {
      const photoBlob = await compressImage(payload.photo);
      form.set("photo", photoBlob, "photo.jpg");

      const res = await fetch("/api/checkin", { method: "POST", body: form });

      if (res.ok) {
        const data = (await res.json()) as CheckinSuccess;
        savePassToLocal(data);
        return data;
      }

      const data = (await res.json().catch(() => ({}))) as CheckinFailure;

      // 409 = already checked in: definitive, no retry
      if (res.status === 409) return { ok: false, error: "already_checked_in" };

      // Validation errors: definitive
      if (res.status < 500 && res.status !== 429) {
        return { ok: false, error: data.error ?? "server_error", field: data.field };
      }
    } catch {
      // network error — fall through to retry
    }

    if (attempt < MAX_ATTEMPTS) {
      onStatus?.(errorMessage("network"), attempt);
      await sleep(1200 * Math.pow(2, attempt - 1));
    }
  }

  return { ok: false, error: "network" };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
