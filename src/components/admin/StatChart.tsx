"use client";

/**
 * Biểu đồ đường vẽ tay bằng SVG (không thêm thư viện chart).
 *
 * - viewBox cố định 720×220, co giãn đều theo bề rộng khung chứa
 * - lưới ngang + nhãn trục Y ở mốc "đẹp" (1/2/5 × 10^n)
 * - nhãn trục X tự thưa bớt khi có nhiều ngày
 * - mỗi điểm có <title> để hover xem số liệu
 */

type Series = {
  label: string;
  color: string;
  values: number[];
};

const W = 720;
const H = 220;
const PAD = { top: 14, right: 14, bottom: 30, left: 38 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

/** Làm tròn trục Y lên mốc 1/2/5 × 10^n để nhãn gọn. */
function niceMax(v: number) {
  if (v <= 5) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return m * pow;
}

/** Nhãn ngày "2026-09-15" → "15/09". */
function shortDate(iso: string) {
  const [, m, d] = iso.split("-");
  return d && m ? `${d}/${m}` : iso;
}

export default function StatChart({
  labels,
  series,
}: {
  labels: string[];
  series: Series[];
}) {
  const n = labels.length;

  if (n === 0) {
    return <p className="mt-4 text-sm text-muted">Chưa có dữ liệu.</p>;
  }

  const rawMax = Math.max(1, ...series.flatMap((s) => s.values));
  const yMax = niceMax(rawMax);

  const xAt = (i: number) =>
    PAD.left + (n <= 1 ? PLOT_W / 2 : (i * PLOT_W) / (n - 1));
  const yAt = (v: number) => PAD.top + PLOT_H - (v / yMax) * PLOT_H;

  // 5 mốc lưới: 0%, 25%, 50%, 75%, 100%
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(yMax * f));

  // Nhãn X: hiện tối đa 7 mốc, luôn có mốc đầu và cuối
  const labelStep = Math.max(1, Math.ceil(n / 7));

  return (
    <div className="mt-4">
      {/* Chú thích */}
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-2">
            <span
              className="inline-block h-0.5 w-5 rounded-full"
              style={{ background: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Biểu đồ theo ngày: ${series.map((s) => s.label).join(", ")}`}
      >
        {/* Lưới ngang + nhãn Y */}
        {gridValues.map((gv) => (
          <g key={gv}>
            <line
              x1={PAD.left}
              y1={yAt(gv)}
              x2={W - PAD.right}
              y2={yAt(gv)}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={yAt(gv) + 4}
              textAnchor="end"
              fontSize="10"
              fill="rgba(255,255,255,0.45)"
            >
              {gv}
            </text>
          </g>
        ))}

        {/* Nhãn ngày */}
        {labels.map((d, i) =>
          i % labelStep === 0 || i === n - 1 ? (
            <text
              key={d + i}
              x={xAt(i)}
              y={H - 10}
              textAnchor="middle"
              fontSize="10"
              fill="rgba(255,255,255,0.45)"
            >
              {shortDate(d)}
            </text>
          ) : null
        )}

        {/* Đường của từng chuỗi */}
        {series.map((s) => {
          const points = s.values
            .map((v, i) => `${xAt(i).toFixed(2)},${yAt(v).toFixed(2)}`)
            .join(" ");
          return (
            <g key={s.label}>
              <polyline
                points={points}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {s.values.map((v, i) => (
                <circle
                  key={i}
                  cx={xAt(i)}
                  cy={yAt(v)}
                  r="2.6"
                  fill={s.color}
                >
                  <title>{`${shortDate(labels[i])} — ${s.label}: ${v}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
