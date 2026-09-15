"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EVENT } from "@/lib/config";
import { GROUPS, SKU_LABEL, type GroupKey } from "@/lib/groups";
import type { AdminRole } from "@/lib/admin-auth";
import AnimatedNumber from "@/components/admin/AnimatedNumber";
import Donut from "@/components/admin/Donut";
import StatChart from "@/components/admin/StatChart";

interface Stats {
  totalVisits: number;
  uniqueVisits: number;
  totalCheckins: number;
  conversionRate: number;
  byDevice: Record<string, number>;
  byBrowser: Record<string, number>;
  byOs: Record<string, number>;
  byReferrer: Record<string, number>;
  byHour: Record<string, number>;
  /** Chuỗi theo ngày cho biểu đồ (đã điền đủ ngày trống) */
  byDay: { date: string; visits: number; checkins: number }[];
}

/** Sắp xếp entry của map theo giá trị giảm dần (dùng cho bar/chip). */
function byValueDesc(obj: Record<string, number>): [string, number][] {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]);
}

/**
 * Staff nhận mốc thời gian đã bị cắt còn "YYYY-MM-DD" (không giờ) →
 * hiển thị dd/mm/yyyy thay vì toLocaleString (sẽ ra "00:00:00").
 */
function formatDateOnly(value: string): string {
  const [y, m, d] = value.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : value;
}

interface CheckinDoc {
  $id: string;
  player_code: string;
  full_name: string;
  phone: string;
  email: string;
  address?: string;
  purchased_skus?: string[];
  photo_file_id: string;
  photo_file_ids?: string[];
  $createdAt: string;
}

const KEY_STORAGE = "cxg_admin_key";
const PAGE_SIZE = 50;

/**
 * Lỗi mạng tạm thời thường tự khỏi → thử lại vài lần trước khi báo.
 * Để 2 (không phải 3): mỗi lần thử lại là 2 request (stats + checkins), mà
 * trường hợp bị extension chặn thì thử lại chắc chắn vẫn fail → chỉ tổ spam log.
 */
const MAX_TRIES = 2;

type LoadFailure = {
  kind: "network" | "auth" | "server";
  msg: string;
};

const FAILURE_MSG: Record<LoadFailure["kind"], string> = {
  network:
    "Không kết nối được server. Nếu đang chạy local, kiểm tra extension chặn quảng cáo (uBlock/AdGuard/Brave) — chúng chặn theo từ khóa trong URL.",
  auth: "Key không đúng hoặc đã hết hạn. Bấm “Đăng nhập lại” để nhập key mới.",
  server: "Server lỗi khi đọc dữ liệu. Thử lại, hoặc xem log server để biết chi tiết.",
};

/** Phân loại 1 request: null nếu thành công, ngược lại là loại lỗi. */
function classify(r: PromiseSettledResult<Response>): LoadFailure["kind"] | null {
  if (r.status === "rejected") return "network";
  if (r.value.ok) return null;
  if (r.value.status === 401 || r.value.status === 403) return "auth";
  return "server";
}

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [checkins, setCheckins] = useState<CheckinDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  /** Lỗi khi tải dữ liệu — phân loại để báo đúng nguyên nhân. */
  const [loadError, setLoadError] = useState<LoadFailure | null>(null);
  /**
   * Vai trò lấy từ server (theo key đã đăng nhập). Mặc định "staff" — mức
   * quyền thấp nhất, để lúc chưa biết role thì UI không lỡ hiện phần admin.
   */
  const [role, setRole] = useState<AdminRole>("staff");
  const isAdmin = role === "admin";
  /** Danh sách đang xem: all | keyboard | mouse | mousepad | mouse_keyboard */
  const [group, setGroup] = useState<GroupKey>("all");
  /** Dropdown chọn danh sách để xuất CSV đang mở. */
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch("/api/admin/summary", {
        headers: { "x-admin-key": key },
      });
      if (res.ok) {
        sessionStorage.setItem(KEY_STORAGE, key);
        setAuthed(true);
      } else {
        setAuthError("Key không đúng. Thử lại.");
      }
    } catch {
      setAuthError("Không kết nối được server.");
    }
  };

  /**
   * Tải stats + danh sách check-in.
   *
   * - Promise.allSettled (KHÔNG phải Promise.all): 1 endpoint lỗi không kéo đổ
   *   endpoint kia, và lỗi mạng không thoát ra thành unhandled rejection
   *   (nguyên nhân bung error overlay "Failed to fetch" của Next).
   * - Lỗi mạng tạm thời (server đang restart/compile) được thử lại tối đa
   *   MAX_TRIES lần trước khi báo → tránh báo động giả.
   * - Chỉ báo "key hết hạn" khi server THỰC SỰ trả 401/403, không đoán.
   */
  const load = useCallback(
    async (search = "", newOffset = 0) => {
      setLoading(true);
      setLoadError(null);

      const headers = { "x-admin-key": key };
      const checkinsUrl = `/api/admin/checkins?event=${EVENT.slug}&group=${group}&limit=${PAGE_SIZE}&offset=${newOffset}${
        search ? `&q=${encodeURIComponent(search)}` : ""
      }`;

      let statsRes!: PromiseSettledResult<Response>;
      let checkinsRes!: PromiseSettledResult<Response>;

      for (let attempt = 1; ; attempt++) {
        [statsRes, checkinsRes] = await Promise.allSettled([
          fetch(`/api/admin/summary?event=${EVENT.slug}`, { headers }),
          fetch(checkinsUrl, { headers }),
        ]);

        const kinds = [classify(statsRes), classify(checkinsRes)].filter(
          (k): k is LoadFailure["kind"] => k !== null
        );
        // Chỉ thử lại khi mọi lỗi đều là mạng; 401/500 thì thử lại vô nghĩa.
        const onlyNetwork = kinds.length > 0 && kinds.every((k) => k === "network");
        if (!onlyNetwork || attempt >= MAX_TRIES) break;
        await new Promise((r) => setTimeout(r, 700 * attempt));
      }

      try {
        const statsData =
          statsRes.status === "fulfilled" && statsRes.value.ok
            ? await statsRes.value.json().catch(() => null)
            : null;
        const checkinsData =
          checkinsRes.status === "fulfilled" && checkinsRes.value.ok
            ? await checkinsRes.value.json().catch(() => null)
            : null;

        if (statsData?.role) setRole(statsData.role);
        if (statsData?.stats) setStats(statsData.stats);
        if (checkinsData?.documents) {
          setCheckins(checkinsData.documents);
          setTotal(checkinsData.total);
          setOffset(newOffset);
        }

        const kinds = [classify(statsRes), classify(checkinsRes)].filter(
          (k): k is LoadFailure["kind"] => k !== null
        );
        if (kinds.length) {
          // Ưu tiên báo nguyên nhân nặng nhất nếu 2 endpoint lỗi khác loại
          const kind: LoadFailure["kind"] = kinds.includes("auth")
            ? "auth"
            : kinds.includes("server")
              ? "server"
              : "network";
          setLoadError({ kind, msg: FAILURE_MSG[kind] });
        }
      } finally {
        setLoading(false);
      }
    },
    [key, group]
  );

  /** Xoá key đã lưu và quay về form đăng nhập. */
  const logout = () => {
    try {
      sessionStorage.removeItem(KEY_STORAGE);
    } catch {
      /* private mode */
    }
    setAuthed(false);
    setKey("");
    setStats(null);
    setCheckins([]);
    setTotal(0);
    setLoadError(null);
  };

  /**
   * Tải CSV qua fetch (gửi kèm x-admin-key header) rồi lưu về máy.
   * Link <a href> trực tiếp không gửi được header → sẽ bị 401.
   *
   * type "register": xuất danh sách đăng ký, chọn 1 trong 5 danh sách qua `groupKey`.
   */
  const downloadCsv = async (
    type: "register" | "analytics",
    groupKey: GroupKey = "all"
  ) => {
    setExportOpen(false);
    try {
      const params = new URLSearchParams({ type, event: EVENT.slug });
      if (type === "register") params.set("group", groupKey);

      const res = await fetch(`/api/admin/export?${params.toString()}`, {
        headers: { "x-admin-key": key },
      });
      if (!res.ok) {
        setLoadError({ kind: "server", msg: "Xuất CSV thất bại. Thử lại giúp mình." });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        type === "register"
          ? `register-${groupKey}-${EVENT.slug}.csv`
          : `analytics-${EVENT.slug}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setLoadError({ kind: "network", msg: "Không kết nối được server để xuất CSV." });
    }
  };

  useEffect(() => {
    const stored = sessionStorage.getItem(KEY_STORAGE);
    if (stored) {
      setKey(stored);
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (authed && key) load();
  }, [authed, key, load]);

  // Đóng dropdown xuất CSV khi click ra ngoài
  useEffect(() => {
    if (!exportOpen) return;
    const onDown = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [exportOpen]);

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <form onSubmit={login} className="w-full max-w-sm border border-line bg-surface p-8">
          <h1 className="display text-2xl font-bold">ADMIN</h1>
          <p className="mt-2 text-sm text-muted">
            Nhập admin key để xem dữ liệu sự kiện.
          </p>
          <input
            type="password"
            className="field mt-6"
            placeholder="Admin key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
          />
          {authError && <p className="mt-2 text-xs text-red-400">{authError}</p>}
          <button type="submit" className="btn-accent mt-6 w-full">
            [ Đăng nhập ]
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="container-c py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="display flex items-center gap-3 text-3xl font-bold">
            DASHBOARD
            <span
              className={`border px-2 py-0.5 text-xs font-semibold tracking-widest ${
                isAdmin
                  ? "border-accent text-accent"
                  : "border-line text-muted"
              }`}
            >
              {isAdmin ? "ADMIN" : "STAFF"}
            </span>
          </h1>
          <p className="text-sm text-muted">{EVENT.title} — {EVENT.slug}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Xuất Register — dropdown custom chọn 1 trong 5 danh sách */}
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              className="btn-ghost !py-2 !px-4 text-xs"
              aria-haspopup="listbox"
              aria-expanded={exportOpen}
              onClick={() => setExportOpen((v) => !v)}
            >
              ⬇ CSV Register
              <span className={`ml-1 inline-block transition-transform ${exportOpen ? "rotate-180" : ""}`}>
                ▾
              </span>
            </button>

            {exportOpen && (
              <ul
                role="listbox"
                className="absolute right-0 z-20 mt-2 w-64 border border-line bg-surface py-1 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)]"
              >
                {GROUPS.map((g) => (
                  <li key={g.key}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={group === g.key}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-xs text-muted transition-colors hover:bg-white/5 hover:text-text"
                      onClick={() => downloadCsv("register", g.key)}
                    >
                      <span className={group === g.key ? "text-accent" : ""}>{g.short}</span>
                      {group === g.key && <span className="text-accent">●</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            className="btn-ghost !py-2 !px-4 text-xs"
            onClick={() => downloadCsv("analytics")}
          >
            ⬇ CSV Analytics
          </button>
          <button
            type="button"
            className="btn-ghost !py-2 !px-4 text-xs"
            onClick={() => load(query, offset)}
          >
            ⟳ Refresh
          </button>
        </div>
      </div>

      {loading && <p className="mt-6 text-sm text-muted">Đang tải…</p>}

      {loadError && (
        <div className="mt-6 flex flex-wrap items-center gap-4 border border-red-500/40 bg-red-500/5 px-4 py-3">
          <p className="text-sm text-red-400">{loadError.msg}</p>
          <button
            type="button"
            className="btn-ghost !py-2 !px-4 text-xs"
            onClick={() => load(query, offset)}
          >
            ⟳ Thử lại
          </button>
          {loadError.kind === "auth" && (
            <button type="button" className="btn-accent !py-2 !px-4 text-xs" onClick={logout}>
              Đăng nhập lại
            </button>
          )}
        </div>
      )}

      {stats && (
        <section className="mt-8">
          {/* KPI cards — số chạy animation */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Tổng truy cập" value={stats.totalVisits} />
            <StatCard label="Truy cập thật (unique)" value={stats.uniqueVisits} accent />
            <StatCard label="Tổng đăng ký" value={stats.totalCheckins} />
            {/* Conversion rate chỉ dành cho admin */}
            {isAdmin && (
              <StatCard
                label="Conversion rate"
                value={stats.conversionRate ?? 0}
                decimals={1}
                suffix="%"
                accent
              />
            )}
          </div>

          {!isAdmin && (
            <p className="mt-4 text-xs text-muted">
              Bạn đang đăng nhập bằng key staff — thông tin cá nhân trong danh
              sách đã được che bớt.
            </p>
          )}

          {/* Biểu đồ theo ngày */}
          <div className="mt-6 border border-line bg-surface p-6">
            <h2 className="display text-lg font-bold">TRUY CẬP &amp; ĐĂNG KÝ THEO NGÀY</h2>
            <StatChart
              labels={stats.byDay.map((d) => d.date)}
              series={[
                {
                  label: "Lượt truy cập",
                  color: "#c1c6c8",
                  values: stats.byDay.map((d) => d.visits),
                },
                {
                  label: "Đăng ký",
                  color: "#ece81a",
                  values: stats.byDay.map((d) => d.checkins),
                },
              ]}
            />
          </div>

          {/* Các breakdown bên dưới CHỈ dành cho admin — server cũng không
              gửi các số liệu này xuống khi đăng nhập bằng key staff. */}
          {isAdmin && (
            <>
          {/* Thiết bị (donut) + Hệ điều hành + Đăng ký theo giờ */}
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="border border-line bg-surface p-6">
              <h2 className="display text-lg font-bold">THIẾT BỊ TRUY CẬP</h2>
              <div className="mt-5">
                <Donut
                  centerLabel="truy cập"
                  centerValue={stats.totalVisits}
                  slices={[
                    { label: "mobile", value: stats.byDevice.mobile ?? 0, color: "#ece81a" },
                    { label: "desktop", value: stats.byDevice.desktop ?? 0, color: "#8c8c8e" },
                    { label: "tablet", value: stats.byDevice.tablet ?? 0, color: "#373638" },
                  ]}
                />
              </div>
            </div>

            <div className="border border-line bg-surface p-6">
              <h2 className="display text-lg font-bold">HỆ ĐIỀU HÀNH</h2>
              {Object.keys(stats.byOs).length === 0 ? (
                <p className="mt-4 text-sm text-muted">Chưa có dữ liệu.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {byValueDesc(stats.byOs).map(([k, v]) => (
                    <BarRow key={k} label={k} value={v} max={stats.totalVisits || 1} />
                  ))}
                </div>
              )}
            </div>

            <div className="border border-line bg-surface p-6">
              <h2 className="display text-lg font-bold">ĐĂNG KÝ THEO GIỜ</h2>
              {Object.keys(stats.byHour).length === 0 ? (
                <p className="mt-4 text-sm text-muted">Chưa có dữ liệu.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {/* byHour: giữ thứ tự thời gian (key tăng dần), không sắp theo số lượng */}
                  {Object.entries(stats.byHour)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([hour, v]) => (
                      <BarRow
                        key={hour}
                        label={hour}
                        value={v}
                        max={Math.max(...Object.values(stats.byHour), 1)}
                      />
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Browser + Referrer */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="border border-line bg-surface p-6">
              <h2 className="display text-lg font-bold">TRÌNH DUYỆT</h2>
              {Object.keys(stats.byBrowser).length === 0 ? (
                <p className="mt-4 text-sm text-muted">Chưa có dữ liệu.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {byValueDesc(stats.byBrowser).map(([k, v]) => (
                    <BarRow key={k} label={k} value={v} max={stats.totalVisits || 1} />
                  ))}
                </div>
              )}
            </div>

            <div className="border border-line bg-surface p-6">
              <h2 className="display text-lg font-bold">NGUỒN TRUY CẬP</h2>
              {Object.keys(stats.byReferrer).length === 0 ? (
                <p className="mt-4 text-sm text-muted">Chưa có dữ liệu.</p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {byValueDesc(stats.byReferrer).map(([k, v]) => (
                    <span key={k} className="border border-line px-2 py-1 text-xs">
                      {k}: <strong className="text-text">{v}</strong>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
            </>
          )}
        </section>
      )}

      {/* 5 danh sách: 4 để quay số + 1 tổng để quản lý số liệu */}
      <section className="mt-10">
        <h2 className="display text-2xl font-bold">DANH SÁCH ĐĂNG KÝ</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {GROUPS.map((g) => {
            const active = group === g.key;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => setGroup(g.key)}
                aria-pressed={active}
                className={`border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  active
                    ? "border-accent bg-accent text-black"
                    : "border-line text-muted hover:border-accent hover:text-accent"
                }`}
              >
                {g.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="display text-lg font-bold">
              {GROUPS.find((g) => g.key === group)?.label ?? "Tổng đăng ký"}
            </h3>
            <p className="text-sm text-muted">Tổng: {total} đăng ký</p>
          </div>
          <div className="flex gap-2">
            <input
              className="field !w-56"
              placeholder={
                isAdmin
                  ? "Tìm tên / SĐT / email / code…"
                  : "Tìm theo mã tham gia…"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") load(query, 0);
              }}
            />
            <button
              type="button"
              className="btn-ghost !py-2 !px-4 text-xs"
              onClick={() => load(query, 0)}
            >
              Tìm
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto border border-line">
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr className="border-b border-line bg-surface text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3">Hóa đơn</th>
                <th className="px-4 py-3">Player Code</th>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">SĐT</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Địa chỉ</th>
                <th className="px-4 py-3">SP đã mua</th>
                <th className="px-4 py-3">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {checkins.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    Chưa có đăng ký nào trong danh sách này.
                  </td>
                </tr>
              ) : (
                checkins.map((c) => {
                  // Dữ liệu cũ chỉ có photo_file_id (1 ảnh) → fallback
                  const photoIds =
                    c.photo_file_ids && c.photo_file_ids.length > 0
                      ? c.photo_file_ids
                      : c.photo_file_id
                        ? [c.photo_file_id]
                        : [];
                  const skus = c.purchased_skus ?? [];

                  return (
                    <tr key={c.$id} className="border-b border-line/50 last:border-0">
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          {photoIds.map((id, i) => {
                            const src = `/api/admin/photo/${id}?k=${encodeURIComponent(key)}`;
                            return (
                              <a key={id} href={src} target="_blank" rel="noreferrer" title={`Ảnh ${i + 1}`}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={src}
                                  alt={`Hóa đơn ${i + 1}`}
                                  className="h-10 w-10 rounded object-cover"
                                  loading="lazy"
                                />
                              </a>
                            );
                          })}
                          {photoIds.length === 0 && (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 font-bold tracking-wide text-accent">
                        {c.player_code}
                      </td>
                      <td className="px-4 py-2">{c.full_name}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{c.phone}</td>
                      <td className="px-4 py-2 text-muted">{c.email}</td>
                      <td className="px-4 py-2 text-muted">
                        <span className="block max-w-[240px] whitespace-normal" title={c.address ?? ""}>
                          {c.address || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {skus.length === 0 ? (
                            <span className="text-xs text-muted">—</span>
                          ) : (
                            skus.map((sku) => (
                              <span
                                key={sku}
                                className="whitespace-nowrap border border-line px-1.5 py-0.5 text-[11px] text-muted"
                              >
                                {SKU_LABEL[sku] ?? sku}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-muted">
                        {/* Staff chỉ nhận về ngày (không giờ) từ server */}
                        {isAdmin
                          ? new Date(c.$createdAt).toLocaleString("vi-VN")
                          : formatDateOnly(c.$createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {total > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => load(query, Math.max(0, offset - PAGE_SIZE))}
              className="btn-ghost !py-2 !px-4 text-xs disabled:opacity-40"
            >
              ← Trang trước
            </button>
            <span className="text-muted">
              Trang {Math.floor(offset / PAGE_SIZE) + 1} /{" "}
              {Math.ceil(total / PAGE_SIZE)} — {total} đăng ký
            </span>
            <button
              type="button"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => load(query, offset + PAGE_SIZE)}
              className="btn-ghost !py-2 !px-4 text-xs disabled:opacity-40"
            >
              Trang sau →
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  suffix = "",
  decimals = 0,
  accent = false,
}: {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  accent?: boolean;
}) {
  return (
    <div className="border border-line bg-surface p-5">
      <p className="text-xs uppercase tracking-widest text-muted">{label}</p>
      <p
        className={`display mt-2 text-4xl font-bold ${
          accent ? "text-accent" : ""
        }`}
      >
        {/* Số đếm chạy từ 0 → giá trị, xem components/admin/AnimatedNumber */}
        <AnimatedNumber value={value} suffix={suffix} decimals={decimals} />
      </p>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 shrink-0 truncate text-muted">{label}</span>
      <div className="h-2 flex-1 bg-line/40">
        <div
          className="h-full bg-accent"
          style={{ width: `${Math.round((value / max) * 100)}%` }}
        />
      </div>
      <span className="w-10 text-right font-semibold">{value}</span>
    </div>
  );
}
