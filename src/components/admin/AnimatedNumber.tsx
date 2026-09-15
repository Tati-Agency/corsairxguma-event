"use client";

import { useEffect, useRef } from "react";

/**
 * Số đếm chạy từ giá trị cũ tới giá trị mới (easeOutCubic).
 *
 * Ghi thẳng vào DOM qua ref thay vì setState mỗi frame → không re-render
 * component cha 60 lần/giây.
 * Tôn trọng prefers-reduced-motion: nhảy thẳng tới giá trị cuối.
 */
export default function AnimatedNumber({
  value,
  suffix = "",
  decimals = 0,
  duration = 900,
  className = "",
}: {
  value: number;
  suffix?: string;
  /** Số chữ số thập phân (vd conversion rate 12.5%) */
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const from = fromRef.current;
    const to = value;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const fmt = (n: number) => `${n.toFixed(decimals)}${suffix}`;

    if (reduce || from === to || duration <= 0) {
      el.textContent = fmt(to);
      fromRef.current = to;
      return;
    }

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      el.textContent = fmt(from + (to - from) * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, suffix, decimals, duration]);

  // SSR/first paint: hiện giá trị khởi điểm (0) rồi rAF đếm lên
  return (
    <span ref={ref} className={className}>
      {(0).toFixed(decimals)}
      {suffix}
    </span>
  );
}
