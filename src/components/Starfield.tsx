import type { CSSProperties } from "react";

/**
 * Starfield overlay — subtle, brand-aligned (Corsair black + gold).
 *
 * Kỹ thuật: 3 layer `radial-gradient` lặp (background-repeat) với tile size
 * khác nhau để tránh lộ pattern. Hoạt động với MỌI kích thước section
 * (footer ngắn ~150px vẫn có sao, không bị clip như cách dùng vw/vh).
 *
 * Vị trí chấm sinh bằng PRNG CÓ SEED (mulberry32) → server và client ra
 * cùng kết quả, không bị hydration mismatch.
 *
 * Đặt trong section nào muốn có nền sao. KHÔNG đặt trong Hero/Countdown
 * (2 section đó đã có ảnh nền riêng).
 */
type Props = {
  /** low (mặc định) cho section thường, medium cho section rộng/cao. */
  density?: "low" | "medium";
  /** white (mặc định) hoặc gold — gold thêm chấm accent vàng. */
  color?: "white" | "gold";
};

/** PRNG có seed — deterministic giữa SSR và client. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type LayerSpec = {
  tileW: number;
  tileH: number;
  dots: number;
  radius: number;
  alpha: number;
  duration: string;
  delay: string;
};

function buildLayers(density: "low" | "medium"): LayerSpec[] {
  const scale = density === "medium" ? 1.5 : 1;
  return [
    // lớp xa: nhiều chấm nhỏ, mờ, twinkle chậm
    { tileW: 560, tileH: 380, dots: Math.round(12 * scale), radius: 1, alpha: 0.5, duration: "7s", delay: "0s" },
    // lớp giữa
    { tileW: 380, tileH: 260, dots: Math.round(8 * scale), radius: 1.2, alpha: 0.7, duration: "5s", delay: "1.4s" },
    // lớp gần: ít chấm, to hơn, sáng hơn, twinkle nhanh hơn
    { tileW: 240, tileH: 170, dots: Math.round(5 * scale), radius: 1.6, alpha: 0.9, duration: "3.5s", delay: "2.6s" },
  ];
}

function gradientFor(spec: LayerSpec, seed: number, gold: boolean) {
  const rand = mulberry32(seed);
  const dots: string[] = [];
  for (let i = 0; i < spec.dots; i++) {
    const x = Math.round(rand() * spec.tileW);
    const y = Math.round(rand() * spec.tileH);
    // Thỉnh thoảng đổi sang vàng nhạt khi color="gold"
    const useGold = gold && rand() > 0.75;
    const rgb = useGold ? "236, 232, 26" : "255, 255, 255";
    const a = (spec.alpha * (0.6 + rand() * 0.4)).toFixed(2);
    dots.push(
      `radial-gradient(${spec.radius}px ${spec.radius}px at ${x}px ${y}px, rgba(${rgb}, ${a}), transparent 100%)`
    );
  }
  return dots.join(",");
}

export default function Starfield({ density = "low", color = "white" }: Props) {
  const specs = buildLayers(density);
  const gold = color === "gold";

  return (
    <div
      aria-hidden="true"
      className="starfield pointer-events-none absolute inset-0 overflow-hidden"
    >
      {specs.map((spec, i) => {
        const style: CSSProperties = {
          backgroundImage: gradientFor(spec, 1000 + i * 37, gold),
          backgroundSize: `${spec.tileW}px ${spec.tileH}px`,
          backgroundRepeat: "repeat",
          animationDuration: spec.duration,
          animationDelay: spec.delay,
        };
        return <div key={i} className="starfield-layer" style={style} />;
      })}
    </div>
  );
}
