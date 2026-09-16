"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

/**
 * Starfield overlay — subtle, brand-aligned (Corsair black + gold).
 *
 * Kỹ thuật: nhiều layer `radial-gradient` lặp (background-repeat). Để KHÔNG
 * lộ pattern dạng "một khuôn/lưới":
 *   - tile size lớn và KHÔNG là bội số của nhau (chu kỳ lặp rất dài)
 *   - mỗi tile nhiều chấm, radius + opacity random riêng từng chấm
 *   - background-position offset riêng từng layer (phá thế thẳng hàng)
 *   - duration/delay twinkle lệch nhau, không pulse đồng loạt
 *
 * Hoạt động với MỌI kích thước section (footer ngắn ~150px vẫn có sao,
 * không bị clip như cách dùng vw/vh trong box-shadow).
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
  /** Seed riêng cho layer — đổi seed là đổi toàn bộ vị trí chấm. */
  seed: number;
  tileW: number;
  tileH: number;
  dots: number;
  /** Mỗi chấm random radius trong khoảng [minR, maxR] (px). */
  minR: number;
  maxR: number;
  /** Mỗi chấm random opacity trong khoảng [minA, maxA]. */
  minA: number;
  maxA: number;
  duration: string;
  delay: string;
  /** Lệch gốc tile — phá thế thẳng hàng giữa các layer. */
  offsetX: number;
  offsetY: number;
};

/**
 * 5 layer với tile size lớn, KHÔNG là bội số của nhau (793/619/487/373/277)
 * → chu kỳ lặp cực dài, mắt không bắt được ô lặp. Delay/duration lệch pha
 * để twinkle không nhấp nháy đồng loạt. Chấm trong mỗi layer được gom cụm
 * (xem gradientFor) nên phân bố lộn xộn, không rải đều. Số chấm giữ theo
 * mật độ (dots ∝ diện tích tile) nên đổi tile không làm đổi độ dày sao.
 */
function buildLayers(density: "low" | "medium"): LayerSpec[] {
  const k = density === "medium" ? 1.4 : 1;
  return [
    // xa nhất: nhiều chấm li ti, mờ
    {
      seed: 1103, tileW: 793, tileH: 601, dots: Math.round(34 * k),
      minR: 0.6, maxR: 1.1, minA: 0.16, maxA: 0.48,
      duration: "9.1s", delay: "0s", offsetX: -137, offsetY: -89,
    },
    {
      seed: 2207, tileW: 619, tileH: 457, dots: Math.round(19 * k),
      minR: 0.7, maxR: 1.3, minA: 0.22, maxA: 0.6,
      duration: "7.3s", delay: "2.1s", offsetX: -311, offsetY: -53,
    },
    {
      seed: 3301, tileW: 487, tileH: 353, dots: Math.round(13 * k),
      minR: 0.9, maxR: 1.6, minA: 0.28, maxA: 0.72,
      duration: "5.9s", delay: "1.3s", offsetX: -89, offsetY: -223,
    },
    {
      // tile lớn hơn bản cũ (311×233) để chu kỳ lặp thưa hơn
      seed: 4409, tileW: 373, tileH: 277, dots: Math.round(11 * k),
      minR: 1.1, maxR: 1.9, minA: 0.36, maxA: 0.86,
      duration: "4.7s", delay: "3.4s", offsetX: -197, offsetY: -149,
    },
    // gần nhất: vài chấm to, sáng rõ (tile 277×211 thay cho 233×181)
    {
      seed: 5501, tileW: 277, tileH: 211, dots: Math.round(8 * k),
      minR: 1.3, maxR: 2.3, minA: 0.5, maxA: 1,
      duration: "3.5s", delay: "0.7s", offsetX: -61, offsetY: -41,
    },
  ];
}

/**
 * Sinh gradient cho 1 layer.
 *
 * Để không trông "rải đều một khuôn", phần lớn chấm được gom thành CỤM
 * (cluster) với tâm + bán kính tán ngẫu nhiên → có vùng sao dày, có vùng
 * trống như bầu trời thật. Một tỉ lệ nhỏ rải tự do để không thành "đốm".
 *
 * Lưu ý: background-repeat vẽ lại gradient theo từng tile và CẮT tại mép
 * tile (không wrap) — nên chấm phải cách mép tối thiểu `pad` px, tránh bị
 * cắt thành vệt ở đường nối giữa 2 tile.
 *
 * Cách đưa chấm vào trong biên: PHẢN CHIẾU (mirror), KHÔNG dùng clamp.
 * Clamp sẽ dồn mọi chấm vượt biên về đúng một giá trị → chúng xếp thành
 * đường thẳng ở mép tile, và vì tile lặp lại nên cả nền hiện ra thành LƯỚI
 * đều đặn. Phản chiếu thì phân bố vẫn rải ra tự nhiên.
 */
function gradientFor(spec: LayerSpec, gold: boolean) {
  const rand = mulberry32(spec.seed);
  const dots: string[] = [];
  const pad = spec.maxR + 1;

  /** Dội giá trị ngoài [lo, hi] ngược vào trong, không dồn về biên. */
  const mirror = (v: number, lo: number, hi: number) => {
    const span = hi - lo;
    if (span <= 0) return lo;
    let t = (((v - lo) % (2 * span)) + 2 * span) % (2 * span);
    if (t > span) t = 2 * span - t;
    return lo + t;
  };
  const mirrorX = (v: number) => mirror(v, pad, spec.tileW - pad);
  const mirrorY = (v: number) => mirror(v, pad, spec.tileH - pad);

  // Tâm các cụm — số cụm ~1/4 số chấm, tán rộng/hẹp ngẫu nhiên
  const clusterCount = Math.max(2, Math.round(spec.dots / 4));
  const clusters = Array.from({ length: clusterCount }, () => ({
    x: rand() * spec.tileW,
    y: rand() * spec.tileH,
    spread: 24 + rand() * 140,
  }));

  for (let i = 0; i < spec.dots; i++) {
    let x: number;
    let y: number;

    if (rand() < 0.78) {
      // Trong cụm: phân bố đĩa đều (sqrt để không dồn về tâm)
      const c = clusters[Math.floor(rand() * clusters.length)];
      const ang = rand() * Math.PI * 2;
      const rad = Math.sqrt(rand()) * c.spread;
      x = mirrorX(c.x + Math.cos(ang) * rad);
      y = mirrorY(c.y + Math.sin(ang) * rad);
    } else {
      // Số ít rải tự do — phá cảm giác "cụm nào cũng giống cụm nào"
      x = mirrorX(rand() * spec.tileW);
      y = mirrorY(rand() * spec.tileH);
    }

    const r = (spec.minR + rand() * (spec.maxR - spec.minR)).toFixed(2);
    const a = (spec.minA + rand() * (spec.maxA - spec.minA)).toFixed(2);
    // ~1/5 chấm ánh vàng khi bật color="gold"
    const useGold = gold && rand() > 0.8;
    const rgb = useGold ? "236, 232, 26" : "255, 255, 255";
    dots.push(
      `radial-gradient(${r}px ${r}px at ${Math.round(x)}px ${Math.round(y)}px, rgba(${rgb}, ${a}), transparent 100%)`
    );
  }
  return dots.join(",");
}

export default function Starfield({ density = "low", color = "white" }: Props) {
  const specs = buildLayers(density);
  const gold = color === "gold";
  const ref = useRef<HTMLDivElement>(null);

  /**
   * Tạm dừng twinkle khi section ngoài màn hình.
   * Mỗi section có 5 layer animation vô hạn, cả trang 5 section → 25 animation
   * chạy mãi không nghỉ. Chỉ section đang nhìn thấy mới cần chạy.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => el.toggleAttribute("data-idle", !entry.isIntersecting),
      // Nới 1 chút để bắt đầu chạy sớm trước khi lọt vào khung nhìn
      { rootMargin: "120px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="starfield pointer-events-none absolute inset-0 overflow-hidden"
    >
      {specs.map((spec, i) => {
        const style: CSSProperties = {
          backgroundImage: gradientFor(spec, gold),
          backgroundSize: `${spec.tileW}px ${spec.tileH}px`,
          backgroundPosition: `${spec.offsetX}px ${spec.offsetY}px`,
          backgroundRepeat: "repeat",
          animationDuration: spec.duration,
          animationDelay: spec.delay,
        };
        return <div key={i} className="starfield-layer" style={style} />;
      })}
    </div>
  );
}
