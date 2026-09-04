"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";
import EventPass from "./EventPass";
import {
  submitCheckin,
  loadPassFromLocal,
  errorMessage,
  type CheckinSuccess,
} from "@/lib/checkin";

type CheckInState =
  | "idle"
  | "verifying"
  | "checking-in"
  | "success"
  | "error"
  | "duplicate";

export default function Checkin() {
  const [state, setState] = useState<CheckInState>("verifying");
  const [pass, setPass] = useState<CheckinSuccess | null>(null);
  const [error, setError] = useState("");
  const [retryInfo, setRetryInfo] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: "", phone: "", email: "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // VERIFY: check existing pass on mount
  useEffect(() => {
    const existing = loadPassFromLocal();
    if (existing) {
      setPass(existing);
      setState("success");
    } else {
      setState("idle");
    }
  }, []);

  const onPickPhoto = (file: File | undefined) => {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      setFieldErrors((fe) => ({ ...fe, photo: "photo_invalid_type" }));
      return;
    }
    setFieldErrors((fe) => ({ ...fe, photo: "" }));
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  /** Live validation: cập nhật giá trị + đánh giá lỗi ngay khi gõ. */
  const updateField = (
    field: "fullName" | "phone" | "email",
    value: string
  ) => {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((fe) => ({
      ...fe,
      [field]: value.trim() ? validateField(field, value) : "",
    }));
  };

  const markTouched = (field: string) =>
    setTouched((t) => ({ ...t, [field]: true }));

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate toàn bộ form trước khi gọi API — không bắn request nếu sai
      const nextErrors: Record<string, string> = {
        fullName: validateField("fullName", form.fullName),
        phone: validateField("phone", form.phone),
        email: validateField("email", form.email),
        photo: photo ? "" : "photo_required",
        consent: consent ? "" : "consent_required",
      };
      setTouched({ fullName: true, phone: true, email: true });
      setFieldErrors(nextErrors);

      const firstBad = ["fullName", "phone", "email", "photo", "consent"].find(
        (k) => nextErrors[k]
      );
      if (firstBad) {
        if (["fullName", "phone", "email"].includes(firstBad)) {
          document.getElementById(firstBad)?.focus();
        }
        return;
      }

      setRetryInfo(null);
      setState("checking-in");

      const result = await submitCheckin(
        { ...form, consent, photo: photo! },
        (msg) => setRetryInfo(msg)
      );

      if (result.ok) {
        setPass(result);
        setState("success");
        document
          .getElementById("event-pass")
          ?.scrollIntoView({ behavior: "smooth" });
      } else {
        setRetryInfo(null);
        if (result.error === "already_checked_in") {
          setState("duplicate");
        } else {
          setFieldErrors(result.field ? { [result.field]: result.error } : {});
          setState("error");
        }
      }
    },
    [form, photo, consent]
  );

  return (
    <section id="checkin" className="section-divider scroll-mt-20 py-16 md:py-32">
      <div className="container-c">
        <Reveal>
          <span className="eyebrow">Check In</span>
          <h2 className="section-title section-title-light mt-4">READY TO ENTER?</h2>
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-start">
          <Reveal delay={100}>
            {state === "verifying" && (
              <div className="card">
                <div className="card-core !p-6 text-center md:!p-10">
                  <p className="display text-xl font-bold">VERIFYING…</p>
                  <p className="mt-2 text-sm text-muted">
                    Đang kiểm tra trạng thái của bạn.
                  </p>
                </div>
              </div>
            )}

            {state === "idle" && (
              <form
                onSubmit={handleSubmit}
                className="card"
              >
                <div className="card-core !p-6 md:!p-8">
                <p className="display text-lg font-bold tracking-wide mb-6">
                  THÔNG TIN CỦA BẠN
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="label" htmlFor="fullName">Họ và tên *</label>
                    <input
                      id="fullName"
                      className={"field" + (fieldErrors.fullName ? " !border-red-400/70" : "")}
                      placeholder="Nguyễn Văn A"
                      value={form.fullName}
                      maxLength={80}
                      required
                      onChange={(e) => updateField("fullName", e.target.value)}
                      onBlur={() => markTouched("fullName")}
                    />
                    {fieldErrors.fullName && (
                      <FieldError msg={errorMessage(fieldErrors.fullName)} />
                    )}
                  </div>

                  <div>
                    <label className="label" htmlFor="phone">Số điện thoại *</label>
                    <input
                      id="phone"
                      className={"field" + (fieldErrors.phone ? " !border-red-400/70" : "")}
                      type="tel"
                      inputMode="numeric"
                      placeholder="09xx xxx xxx"
                      value={form.phone}
                      maxLength={15}
                      required
                      onChange={(e) => updateField("phone", e.target.value)}
                      onBlur={() => markTouched("phone")}
                    />
                    {fieldErrors.phone && (
                      <FieldError msg={errorMessage(fieldErrors.phone)} />
                    )}
                  </div>

                  <div>
                    <label className="label" htmlFor="email">Email *</label>
                    <input
                      id="email"
                      className={"field" + (fieldErrors.email ? " !border-red-400/70" : "")}
                      type="email"
                      placeholder="ban@email.com"
                      value={form.email}
                      maxLength={120}
                      required
                      onChange={(e) => updateField("email", e.target.value)}
                      onBlur={() => markTouched("email")}
                    />
                    {fieldErrors.email && (
                      <FieldError msg={errorMessage(fieldErrors.email)} />
                    )}
                  </div>

                  <div>
                    <span className="label">Hình ảnh của bạn *</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => onPickPhoto(e.target.files?.[0])}
                    />
                    {photoPreview ? (
                      <div className="flex items-center gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoPreview}
                          alt="Xem trước ảnh của bạn"
                          className="h-20 w-20 rounded-lg object-cover border border-line"
                        />
                        <button
                          type="button"
                          className="btn-ghost !py-2 !px-4 text-xs"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Đổi ảnh
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-ghost w-full !py-3 text-sm"
                      >
                        📷 Chụp / chọn ảnh
                      </button>
                    )}
                    {fieldErrors.photo && (
                      <FieldError msg={errorMessage(fieldErrors.photo)} />
                    )}
                    <p className="mt-2 text-xs text-muted">
                      Ảnh được nén ngay trên máy bạn trước khi gửi — chỉ dùng
                      cho sự kiện.
                    </p>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#ece81a]"
                    />
                    <span>
                      Tôi đồng ý cho ban tổ chức lưu hình ảnh này phục vụ sự
                      kiện. *
                      {fieldErrors.consent && (
                        <FieldError msg={errorMessage("consent_required")} />
                      )}
                    </span>
                  </label>
                </div>

                <button type="submit" className="btn-accent mt-8 w-full">
                  [ Check In ]
                  <span className="arrow">→</span>
                </button>
                </div>
              </form>
            )}

            {state === "checking-in" && (
              <div className="card">
                <div className="card-core !p-6 text-center md:!p-10">
                  <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent" />
                  <p className="display text-xl font-bold">CHECKING YOU IN…</p>
                  <p className="mt-2 text-sm text-muted">
                    {retryInfo ?? "Vui lòng giữ mở màn hình này."}
                  </p>
                </div>
              </div>
            )}

            {state === "duplicate" && (
              <div className="card border-accent/40">
                <div className="card-core !p-6 text-center md:!p-10">
                  <p className="text-3xl">📮</p>
                  <p className="display mt-3 text-xl font-bold text-accent">
                    ĐÃ ĐĂNG KÝ TRƯỚC ĐÓ
                  </p>
                  <p className="mt-3 text-sm text-muted">
                    Số điện thoại <span className="text-foreground font-semibold">{form.phone}</span> đã
                    được check-in từ trước. Vui lòng kiểm tra email để xem lại
                    Event Pass của bạn, hoặc liên hệ staff tại sự kiện nếu cần hỗ trợ.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFieldErrors({});
                      setState("idle");
                    }}
                    className="btn-ghost mt-6 !py-2 !px-4 text-xs"
                  >
                    [ Dùng số khác ]
                  </button>
                </div>
              </div>
            )}

            {state === "error" && (
              <div className="card border-red-500/40">
                <div className="card-core !p-6 text-center md:!p-10">
                  <p className="display text-xl font-bold text-red-400">
                    ĐÃ CÓ LỖI XẢY RA
                  </p>
                  <p className="mt-3 text-sm text-muted">{errorMessage(error)}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setFieldErrors({});
                      setState("idle");
                    }}
                    className="btn-accent mt-6"
                  >
                    [ Thử lại ]
                    <span className="arrow">→</span>
                  </button>
                </div>
              </div>
            )}

            {state === "success" && (
              <div className="card border-accent/40">
                <div className="card-core !p-6 text-center md:!p-10">
                  <p className="display text-3xl font-bold text-accent">✓ CHECKED IN</p>
                  <p className="mt-3 text-sm text-muted">
                    Chúc mừng {pass?.fullName}! Bạn đã chính thức có mặt tại sự
                    kiện.
                  </p>
                  <a href="#event-pass" className="btn-accent mt-6">
                    [ View Event Pass ]
                    <span className="arrow">→</span>
                  </a>
                </div>
              </div>
            )}
          </Reveal>

          {/* ---------- RIGHT: inline pass ---------- */}
          <div id="event-pass" className="scroll-mt-24">
            {state === "success" && pass ? (
              <Reveal delay={150}>
                <EventPass pass={pass} />
              </Reveal>
            ) : (
              <Reveal delay={200}>
                <div className="card h-full">
                  <div className="card-core !p-6 text-center flex flex-col items-center justify-center min-h-[260px] md:!p-8">
                    <p className="display text-2xl font-bold text-line">EVENT PASS</p>
                    <p className="mt-3 text-sm text-muted">
                      Event Pass cá nhân của bạn sẽ xuất hiện tại đây sau khi
                      check-in — kèm mã người chơi và mã QR dùng trong suốt sự kiện.
                    </p>
                  </div>
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="mt-1.5 text-xs text-red-400">{msg}</p>;
}

/* ---------- Client-side validation (mirror rules của /api/checkin) ---------- */

const NAME_RE = /^[\p{L}\p{M}'.\- ]{2,80}$/u;
const PHONE_RE = /^0\d{8,10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function validateField(field: string, value: string): string {
  switch (field) {
    case "fullName":
      return NAME_RE.test(value.trim()) ? "" : "invalid_name";
    case "phone":
      // Cho phép nhập kèm khoảng trắng / dấu chấm / gạch ngang / ngoặc
      return PHONE_RE.test(value.replace(/[\s.\-()]/g, "")) ? "" : "invalid_phone";
    case "email":
      return EMAIL_RE.test(value.trim()) ? "" : "invalid_email";
    default:
      return "";
  }
}
