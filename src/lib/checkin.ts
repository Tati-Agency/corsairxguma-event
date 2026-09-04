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
  phone?: string;
  email?: string;
  createdAt?: string;
}

export interface CheckinFailure {
  ok: false;
  error: string;
  field?: string;
  retryable?: boolean;
}

export type CheckinResult = CheckinSuccess | CheckinFailure;

// ---- Masking (cho QR & Event Pass — staff xem đầy đủ trong /admin) ----

/** SĐT: chỉ hiện 4 số cuối — VD: ••••1234 */
export function maskPhone(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return `••••${digits.slice(-4)}`;
}

/** Email: 3 ký tự đầu + 6 ký tự cuối — VD: ngu••••il.com */
export function maskEmail(email?: string): string {
  if (!email) return "";
  if (email.length <= 9) return `${email.slice(0, 3)}•••`;
  return `${email.slice(0, 3)}••••${email.slice(-6)}`;
}

/** Thời gian: chỉ ngày, không giờ — VD: 09/03/2026 */
export function formatDateOnly(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Nội dung mã QR: mã vé + thông tin đã điền (SĐT/email đã mask, ngày không giờ).
 * Định dạng text để staff quét bằng camera là đọc được ngay.
 * Các pass cũ (lưu localStorage trước khi có phone/email) sẽ tự bỏ dòng thiếu.
 */
export function buildQrPayload(pass: CheckinSuccess): string {
  const lines = [
    "CORSAIR x GUMAYUSI - EVENT TICKET",
    `CODE: ${pass.playerCode}`,
    `NAME: ${pass.fullName}`,
  ];
  const maskedPhone = maskPhone(pass.phone);
  const maskedEmail = maskEmail(pass.email);
  const date = formatDateOnly(pass.createdAt);
  if (maskedPhone) lines.push(`PHONE: ${maskedPhone}`);
  if (maskedEmail) lines.push(`EMAIL: ${maskedEmail}`);
  if (date) lines.push(`DATE: ${date}`);
  return lines.join("\n");
}

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
  already_checked_in: "Đã đăng ký trước đó! Vui lòng kiểm tra email để xem lại Event Pass, hoặc liên hệ staff nếu cần hỗ trợ.",
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
