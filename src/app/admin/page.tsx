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

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [checkins, setCheckins] = useState<CheckinDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

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

  const load = useCallback(
    async (search = "") => {
      setLoading(true);
      try {
        const headers = { "x-admin-key": key };
        const [statsRes, checkinsRes] = await Promise.all([
          fetch(`/api/admin/stats?event=${EVENT.slug}`, { headers }),
          fetch(
            `/api/admin/checkins?event=${EVENT.slug}&limit=50${
              search ? `&q=${encodeURIComponent(search)}` : ""
            }`,
            { headers }
          ),
        ]);
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats);
        }
        if (checkinsRes.ok) {
          const data = await checkinsRes.json();
          setCheckins(data.documents);
          setTotal(data.total);
        }
      } finally {
        setLoading(false);
      }
    },
    [key]
  );

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
          <a
            href={`/api/admin/export?type=checkins&event=${EVENT.slug}`}
            target="_blank"
            className="btn-ghost !py-2 !px-4 text-xs"
          >
            ⬇ CSV Check-in
          </a>
          <a
            href={`/api/admin/export?type=analytics&event=${EVENT.slug}`}
            target="_blank"
            className="btn-ghost !py-2 !px-4 text-xs"
          >
            ⬇ CSV Analytics
          </a>
          <button
            type="button"
            className="btn-ghost !py-2 !px-4 text-xs"
            onClick={() => load(query)}
          >
            ⟳ Refresh
          </button>
        </div>
      </div>

      {loading && <p className="mt-6 text-sm text-muted">Đang tải…</p>}

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
            <StatCard label="Tổng check-in" value={stats.totalCheckins} />
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
              <h2 className="display text-lg font-bold">CHECK-IN THEO GIỜ</h2>
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
            <h2 className="display text-2xl font-bold">DANH SÁCH KHÁCH</h2>
            <p className="text-sm text-muted">Tổng: {total} check-in</p>
          </div>
          <div className="flex gap-2">
            <input
              className="field !w-56"
              placeholder="Tìm theo tên…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") load(query);
              }}
            />
            <button
              type="button"
              className="btn-ghost !py-2 !px-4 text-xs"
              onClick={() => load(query)}
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
                    Chưa có check-in nào.
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
                    <td className="px-4 py-2 font-mono font-bold text-accent">
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
