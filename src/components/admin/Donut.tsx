"use client";

/**
 * Biểu đồ vành khuyên (donut) vẽ bằng SVG.
 * Kỹ thuật: 1 vòng tròn nền + các cung dùng stroke-dasharray xếp nối tiếp
 * theo chu vi, không cần thư viện chart.
 */

type Slice = {
  label: string;
  value: number;
  color: string;
};

const SIZE = 160;
const STROKE = 18;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export default function Donut({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: Slice[];
  centerLabel: string;
  centerValue: string | number;
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  let offset = 0;
  const arcs = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const len = (s.value / total) * C;
      const arc = { ...s, len, offset };
      offset += len;
      return arc;
    });

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`${centerLabel}: ${centerValue}`}
        >
          {/* Vòng nền khi chưa có dữ liệu */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={STROKE}
          />
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {arcs.map((a) => (
              <circle
                key={a.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={a.color}
                strokeWidth={STROKE}
                strokeDasharray={`${a.len} ${C - a.len}`}
                strokeDashoffset={-a.offset}
              >
                <title>{`${a.label}: ${a.value} (${total ? Math.round((a.value / total) * 100) : 0}%)`}</title>
              </circle>
            ))}
          </g>
        </svg>

        {/* Số ở giữa */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="display text-2xl font-bold">{centerValue}</span>
          <span className="text-[10px] uppercase tracking-widest text-muted">
            {centerLabel}
          </span>
        </div>
      </div>

      {/* Chú thích kèm % */}
      <ul className="min-w-[140px] flex-1 space-y-2 text-sm">
        {slices.map((s) => {
          const pct = total ? Math.round((s.value / total) * 100) : 0;
          return (
            <li key={s.label} className="flex items-center gap-3">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: s.color }}
              />
              <span className="flex-1 capitalize text-muted">{s.label}</span>
              <span className="font-semibold text-text">{s.value}</span>
              <span className="w-10 text-right text-xs text-muted">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
