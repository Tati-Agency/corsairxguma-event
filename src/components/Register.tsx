"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";
import {
  submitCheckin,
  loadPassFromLocal,
  errorMessage,
  type CheckinSuccess,
} from "@/lib/checkin";
import ProductSelector from "./ProductSelector";
import RulesPanel from "./RulesPanel";
import { EVENT_END_MS } from "@/lib/config";

type RegisterState =
  | "idle"
  | "verifying"
  | "checking-in"
  | "success"
  | "error"
  | "duplicate";

export default function Register() {
  const [state, setState] = useState<RegisterState>("verifying");
  const [pass, setPass] = useState<CheckinSuccess | null>(null);
  const [error, setError] = useState("");
  const [retryInfo, setRetryInfo] = useState<string | null>(null);
  const [form, setForm] = useState({ fullName: "", phone: "", email: "" });
  const [invoices, setInvoices] = useState<File[]>([]);
  const [invoicePreviews, setInvoicePreviews] = useState<string[]>([]);
  const [purchasedSkus, setPurchasedSkus] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  /** Nút Đăng ký chỉ được mở khi countdown finished (Date.now() >= EVENT_END_MS).
      Poll mỗi giây để chuyển state đúng lúc. */
  const [countdownFinished, setCountdownFinished] = useState(
    typeof window !== "undefined" && Date.now() >= EVENT_END_MS
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // VERIFY: kiểm tra phiếu đăng ký đã lưu trên máy
  useEffect(() => {
    const existing = loadPassFromLocal();
    if (existing) {
      setPass(existing);
      setState("success");
    } else {
      setState("idle");
    }
  }, []);

  // Poll countdown state mỗi giây — khi đếm ngược kết thúc thì mở nút Đăng ký
  useEffect(() => {
    if (countdownFinished) return;
    const id = window.setInterval(() => {
      if (Date.now() >= EVENT_END_MS) {
        setCountdownFinished(true);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [countdownFinished]);

  // Cleanup object URLs khi unmount hoặc khi previews thay đổi
  useEffect(() => {
    return () => {
      invoicePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPickInvoices = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const incoming = Array.from(files);
    const current = invoices.length;

    // Validate từng file: type + soft 20MB (cảnh báo) + hard 35MB (chặn)
    const valid: File[] = [];
    let firstError = "";
    for (const f of incoming) {
      if (!PHOTO_TYPES.includes(f.type)) {
        firstError = "invoice_invalid_type";
        break;
      }
      if (f.size > HARD_MAX_BYTES_PER_PHOTO) {
        firstError = "invoice_too_large_per_file";
        break;
      }
      valid.push(f);
    }
    if (firstError) {
      setFieldErrors((fe) => ({ ...fe, invoice: firstError }));
      return;
    }

    // Tổng cộng không vượt quá max — chặn luôn
    if (current + valid.length > MAX_PHOTOS) {
      setFieldErrors((fe) => ({ ...fe, invoice: "invoice_too_many" }));
      return;
    }

    // Cảnh báo soft nếu có ảnh > 20MB (vẫn cho phép, chỉ note)
    const hasSoftOversize = valid.some((f) => f.size > SOFT_MAX_BYTES_PER_PHOTO);

    setInvoices((prev) => [...prev, ...valid]);
    setInvoicePreviews((prev) => [
      ...prev,
      ...valid.map((f) => URL.createObjectURL(f)),
    ]);
    setFieldErrors((fe) => ({
      ...fe,
      invoice: "",
      ...(hasSoftOversize ? { invoiceSoft: "invoice_soft_limit" } : {}),
    }));
  };

  const togglePurchasedSku = (sku: string) => {
    setPurchasedSkus((prev) =>
      prev.includes(sku) ? prev.filter((s) => s !== sku) : [...prev, sku]
    );
    setFieldErrors((fe) => ({ ...fe, purchased: "" }));
  };

  const removeInvoice = (idx: number) => {
    setInvoices((prev) => prev.filter((_, i) => i !== idx));
    setInvoicePreviews((prev) => {
      const removed = prev[idx];
      if (removed) URL.revokeObjectURL(removed);
      return prev.filter((_, i) => i !== idx);
    });
    setFieldErrors((fe) => ({ ...fe, invoice: "", invoiceSoft: "" }));
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
        purchased: purchasedSkus.length > 0 ? "" : "purchased_required",
        invoice: invoices.length > 0 ? "" : "invoice_required",
        consent: consent ? "" : "consent_required",
      };
      setTouched({ fullName: true, phone: true, email: true });
      setFieldErrors(nextErrors);

      const firstBad = ["fullName", "phone", "email", "purchased", "invoice", "consent"].find(
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
        { ...form, consent, invoices, purchasedSkus },
        (msg) => setRetryInfo(msg)
      );

      if (result.ok) {
        setPass(result);
        setState("success");
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
    [form, invoices, purchasedSkus, consent]
  );

  return (
    <section id="register" className="section-divider scroll-mt-20 py-16 md:py-32">
      <div className="container-c">
        <Reveal>
          <span className="eyebrow">Đăng ký tham gia</span>
          <h2 className="section-title section-title-light mt-4">REGISTER NOW.</h2>
        </Reveal>

        {/* Desktop (md+): grid 2 cột — thể lệ trái, form phải.
            Mobile: stack dọc — thể lệ trên, form dưới (giống Google Form). */}
        <div className="mt-12 grid grid-cols-1 items-start gap-8 md:grid-cols-2">
          <Reveal>
            <RulesPanel />
          </Reveal>

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
                    <span className="label">Sản phẩm GUMAYUSI Collection đã mua *</span>
                    <ProductSelector
                      selectedSkus={purchasedSkus}
                      onToggle={togglePurchasedSku}
                    />
                    {fieldErrors.purchased && (
                      <FieldError msg={errorMessage(fieldErrors.purchased)} />
                    )}
                    <p className="mt-2 text-xs text-muted">
                      Chọn 1 hoặc nhiều sản phẩm — dùng để xác minh quyền tham gia lucky-draw.
                    </p>
                  </div>

                  <div>
                    <span className="label">Ảnh hóa đơn mua hàng *</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      multiple
                      onChange={(e) => {
                        onPickInvoices(e.target.files);
                        e.target.value = ""; // cho phép chọn lại cùng file
                      }}
                    />

                    {invoicePreviews.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-3">
                        {invoicePreviews.map((url, i) => (
                          <div key={url} className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`Ảnh hóa đơn ${i + 1}`}
                              className="h-24 w-full rounded-lg object-cover border border-line"
                            />
                            <button
                              type="button"
                              onClick={() => removeInvoice(i)}
                              aria-label={`Xóa ảnh ${i + 1}`}
                              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/80 text-xs text-white hover:bg-red-500"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {invoices.length < MAX_PHOTOS && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-ghost mt-3 w-full !py-3 text-sm"
                      >
                        {invoices.length === 0
                          ? "🧾 Tải ảnh hóa đơn"
                          : `➕ Thêm ảnh (${invoices.length}/${MAX_PHOTOS})`}
                      </button>
                    )}

                    {fieldErrors.invoice && (
                      <FieldError msg={errorMessage(fieldErrors.invoice)} />
                    )}
                    {fieldErrors.invoiceSoft && (
                      <p className="mt-1.5 text-xs text-accent">
                        {errorMessage(fieldErrors.invoiceSoft)}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted">
                      Giới hạn ảnh đăng tải là &lt;20mb, Tối đa 3 ảnh.
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
                      Tôi xác nhận hóa đơn trên là của tôi và đồng ý cho ban tổ
                      chức lưu lại để xác minh việc mua sản phẩm GUMAYUSI Collection. *
                      {fieldErrors.consent && (
                        <FieldError msg={errorMessage("consent_required")} />
                      )}
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn-accent mt-8 w-full"
                  disabled={!countdownFinished}
                >
                  {countdownFinished
                    ? "[ Đăng ký LUCKYDRAW ]"
                    : "[ Đăng ký sẽ được mở vào 22/9 ]"}
                </button>
                </div>
              </form>
            )}

            {state === "checking-in" && (
              <div className="card">
                <div className="card-core !p-6 text-center md:!p-10">
                  <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent" />
                  <p className="display text-xl font-bold">ĐANG XÁC MINH…</p>
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
                    đăng ký từ trước. Vui lòng kiểm tra email để xem lại mã tham gia,
                    hoặc liên hệ staff nếu cần hỗ trợ.
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
                  <p className="display text-3xl font-bold text-accent">✓ ĐÃ ĐĂNG KÝ</p>
                  <p className="mt-3 text-sm text-muted">
                    Chúc mừng {pass?.fullName}! Bạn đã ghi danh tham gia chương
                    trình dành riêng cho chủ nhân GUMAYUSI Collection.
                  </p>
                </div>
              </div>
            )}
          </Reveal>
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
const MAX_PHOTOS = 3;
const SOFT_MAX_BYTES_PER_PHOTO = 20 * 1024 * 1024; // 20MB/ảnh — khuyến nghị (note cho user)
const HARD_MAX_BYTES_PER_PHOTO = 35 * 1024 * 1024; // 35MB/ảnh — chặn cứng (điện thoại chụp phân giải cao)

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