"use client";

import { useCallback, useEffect, useState } from "react";
import { EVENT } from "@/lib/config";

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
}

interface CheckinDoc {
  $id: string;
  player_code: string;
  full_name: string;
  phone: string;
  email: string;
  photo_file_id: string;
  $createdAt: string;
}

const KEY_STORAGE = "cxg_admin_key";
const PAGE_SIZE = 50;

/** Lỗi mạng tạm thời thường tự khỏi → thử lại vài lần trước khi báo. */
const MAX_TRIES = 3;

type LoadFailure = {
  kind: "network" | "auth" | "server";
  msg: string;
};

const FAILURE_MSG: Record<LoadFailure["kind"], string> = {
  network: "Không kết nối được server (có thể đang khởi động lại). Thử lại sau vài giây.",
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

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch("/api/admin/stats", {
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
      const checkinsUrl = `/api/admin/checkins?event=${EVENT.slug}&limit=${PAGE_SIZE}&offset=${newOffset}${
        search ? `&q=${encodeURIComponent(search)}` : ""
      }`;

      let statsRes!: PromiseSettledResult<Response>;
      let checkinsRes!: PromiseSettledResult<Response>;

      for (let attempt = 1; ; attempt++) {
        [statsRes, checkinsRes] = await Promise.allSettled([
          fetch(`/api/admin/stats?event=${EVENT.slug}`, { headers }),
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
    [key]
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
   */
  const downloadCsv = async (type: "checkins" | "analytics") => {
    try {
      const res = await fetch(`/api/admin/export?type=${type}&event=${EVENT.slug}`, {
        headers: { "x-admin-key": key },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-${EVENT.slug}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore — user can retry
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
          <h1 className="display text-3xl font-bold">DASHBOARD</h1>
          <p className="text-sm text-muted">{EVENT.title} — {EVENT.slug}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-ghost !py-2 !px-4 text-xs"
            onClick={() => downloadCsv("checkins")}
          >
            ⬇ CSV Check-in
          </button>
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
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Tổng truy cập" value={stats.totalVisits} />
            <StatCard
              label="Truy cập thật (unique)"
              value={stats.uniqueVisits}
              accent
            />
            <StatCard label="Tổng đăng ký" value={stats.totalCheckins} />
            <StatCard
              label="Conversion rate"
              value={`${stats.conversionRate}%`}
              accent
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {/* Device breakdown */}
            <div className="border border-line bg-surface p-6">
              <h2 className="display text-lg font-bold">THIẾT BỊ TRUY CẬP</h2>
              <div className="mt-4 space-y-3">
                {Object.entries(stats.byDevice).map(([k, v]) => (
                  <BarRow key={k} label={k} value={v} max={stats.totalVisits || 1} />
                ))}
              </div>
              <h3 className="display mt-6 text-sm font-bold tracking-widest text-muted">
                BROWSER
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(stats.byBrowser).map(([k, v]) => (
                  <span key={k} className="border border-line px-2 py-1 text-xs">
                    {k}: <strong className="text-text">{v}</strong>
                  </span>
                ))}
              </div>
            </div>

            {/* Check-in timeline */}
            <div className="border border-line bg-surface p-6">
              <h2 className="display text-lg font-bold">ĐĂNG KÝ THEO GIỜ</h2>
              {Object.keys(stats.byHour).length === 0 ? (
                <p className="mt-4 text-sm text-muted">Chưa có dữ liệu.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {Object.entries(stats.byHour).map(([hour, v]) => (
                    <BarRow
                      key={hour}
                      label={hour}
                      value={v}
                      max={Math.max(...Object.values(stats.byHour), 1)}
                    />
                  ))}
                </div>
              )}
              <h3 className="display mt-6 text-sm font-bold tracking-widest text-muted">
                REFERRER
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(stats.byReferrer).map(([k, v]) => (
                  <span key={k} className="border border-line px-2 py-1 text-xs">
                    {k}: <strong className="text-text">{v}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Check-ins table */}
      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="display text-2xl font-bold">DANH SÁCH ĐĂNG KÝ</h2>
            <p className="text-sm text-muted">Tổng: {total} đăng ký</p>
          </div>
          <div className="flex gap-2">
            <input
              className="field !w-56"
              placeholder="Tìm tên / SĐT / email / code…"
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
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line bg-surface text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3">Ảnh</th>
                <th className="px-4 py-3">Player Code</th>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">SĐT</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {checkins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    Chưa có đăng ký nào.
                  </td>
                </tr>
              ) : (
                checkins.map((c) => (
                  <tr key={c.$id} className="border-b border-line/50 last:border-0">
                    <td className="px-4 py-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/admin/photo/${c.photo_file_id}?k=${encodeURIComponent(key)}`}
                        alt=""
                        className="h-10 w-10 rounded object-cover"
                      />
                    </td>
                    <td className="px-4 py-2 font-bold tracking-wide text-accent">
                      {c.player_code}
                    </td>
                    <td className="px-4 py-2">{c.full_name}</td>
                    <td className="px-4 py-2">{c.phone}</td>
                    <td className="px-4 py-2 text-muted">{c.email}</td>
                    <td className="px-4 py-2 text-muted">
                      {new Date(c.$createdAt).toLocaleString("vi-VN")}
                    </td>
                  </tr>
                ))
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
              {Math.ceil(total / PAGE_SIZE)} — {total} check-in
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
  accent = false,
}: {
  label: string;
  value: number | string;
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
        {value}
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
