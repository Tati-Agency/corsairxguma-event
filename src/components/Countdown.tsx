"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";

/* ============================================================
   GUMA Countdown — "ROAD TO THE STAR"
   - Ngôi sao GUMA vàng chạy dọc đường thẳng = tiến trình 14 ngày
     (mở cổng pre-order ngày 22.09.2026).
   - Số đếm cuộn kiểu rolling-digit (Saira Expanded Light).
   - Road to the star: đường # + phần trăm.
   Perf: rAF chỉ chạy khi trong viewport (IntersectionObserver).
   ============================================================ */

const TARGET = new Date(2026, 8, 22, 0, 0, 0); // 22/09/2026 00:00
const WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // cửa sổ 14 ngày

// Đường chạy của ngôi sao — thẳng (không vòng cung)
const ARCH = "M 24 72 L 436 72";
const LINE_Y = 72;

function notchAt(t: number) {
  const x = 24 + t * (436 - 24);
  return { x1: x, y1: LINE_Y - 6, x2: x, y2: LINE_Y + 6 };
}

const NOTCHES = Array.from({ length: 9 }, (_, i) => notchAt((i + 1) / 10));

/* Ngôi sao 4 cánh GUMA — 4 gạch tỏa sáng ở giữa, xoay tròn nhẹ */
const STAR_PATH =
  "M 0 -6.5 L 1.5 -1.5 L 6.5 0 L 1.5 1.5 L 0 6.5 L -1.5 1.5 L -6.5 0 L -1.5 -1.5 Z";

const UNITS = [
  { label: "Ngày", cellCount: 2 },
  { label: "Giờ", cellCount: 2 },
  { label: "Phút", cellCount: 2 },
  { label: "Giây", cellCount: 2 },
];

function pad2(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

export default function Countdown() {
  const panelRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  const sunRef = useRef<SVGGElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<HTMLDivElement>(null);
  const stripsRef = useRef<(HTMLDivElement | null)[]>([]);
  const sectionElRef = useRef<HTMLElement>(null);
  /** Khi countdown finished + user scroll tới section → mở rộng panel thành video YouTube.
      Một chiều, không reset (F5 mới về false). */
  const [videoMode, setVideoMode] = useState(false);

  useEffect(() => {
    const core = coreRef.current;
    const fill = fillRef.current;
    const sun = sunRef.current;
    const track = trackRef.current;
    const pct = pctRef.current;
    const rail = railRef.current;
    if (!core || !fill || !sun || !track || !pct || !rail) return;

    const total = track.getTotalLength();
    fill.style.strokeDasharray = `${total}`;
    fill.style.strokeDashoffset = `${total}`;

    const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
    const start = TARGET.getTime() - WINDOW_MS;
    const end = TARGET.getTime();

    let raf = 0;
    let running = false;
    let finished = false;
    let lastSecond = -1;
    let lastPct = -1;
    const prevDigits: number[] = [0, 0, 0, 0, 0, 0, 0, 0];

    function applyUnit(unitIdx: number, value: number) {
      const str = pad2(value);
      for (let c = 0; c < 2; c++) {
        const digit = Number(str[c]);
        const stripIdx = unitIdx * 2 + c;
        const strip = stripsRef.current[stripIdx];
        if (!strip) continue;
        strip.style.transform = `translateY(-${digit * 10}%)`;
        if (digit !== prevDigits[stripIdx]) {
          prevDigits[stripIdx] = digit;
          const cell = strip.closest<HTMLElement>(".count-cell");
          if (cell) {
            cell.classList.remove("count-cell--tick");
            // force reflow để kích hoạt lại animation flash
            void cell.offsetWidth;
            cell.classList.add("count-cell--tick");
            window.setTimeout(() => cell.classList.remove("count-cell--tick"), 480);
          }
        }
      }
    }

    const finish = () => {
      if (finished) return;
      finished = true;
      UNITS.forEach((_, i) => applyUnit(i, 0));
      core.dataset.finished = "true";
      pct.textContent = "100%";
      if (rail) rail.style.transform = "scaleX(1)";
      if (timerRef.current) timerRef.current.setAttribute("aria-label", "Cổng đã mở.");
    };

    const frame = () => {
      if (!running && !finished) return;
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        finish();
        return;
      }

      // Ngôi sao + đường thẳng cập nhật liên tục (mượt 60fps)
      const p = clamp((now - start) / (end - start), 0, 1);
      const pt = track.getPointAtLength(p * total);
      sun.setAttribute("transform", `translate(${pt.x.toFixed(2)} ${pt.y.toFixed(2)})`);
      fill.style.strokeDashoffset = `${total * (1 - p)}`;

      // Rails + phần trăm chỉ cập nhật khi đổi giá trị hiển thị
      const pctRound = Math.round(p * 100);
      if (pctRound !== lastPct) {
        lastPct = pctRound;
        pct.textContent = `${pctRound}%`;
        if (rail) rail.style.transform = `scaleX(${p})`;
      }

      // Số đếm cập nhật mỗi giây
      const sec = Math.floor(diff / 1000);
      if (sec !== lastSecond) {
        lastSecond = sec;
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        applyUnit(0, d);
        applyUnit(1, h);
        applyUnit(2, m);
        applyUnit(3, s);
        if (timerRef.current) {
          timerRef.current.setAttribute(
            "aria-label",
            `Còn ${d} ngày ${h} giờ ${m} phút ${s} giây`
          );
        }
      }
    };

    // Chỉ chạy khi trong viewport — tiết kiệm CPU trên di động
    let idle = false;
    const onVisible = (entries: IntersectionObserverEntry[]) => {
      const visible = entries[0]?.isIntersecting ?? true;
      idle = !visible;
      core.toggleAttribute("data-idle", idle);
      if (visible && !finished && !running) {
        running = true;
        raf = requestAnimationFrame(function loop() {
          frame();
          if (running) raf = requestAnimationFrame(loop);
        });
      } else if (!visible && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(onVisible, { threshold: 0.12 });
    observer?.observe(core);

    // Chạy 1 frame ngay để không bao giờ đứng ở 00:00:00
    onVisible([{ isIntersecting: true } as IntersectionObserverEntry]);

    // Đúng giờ mở cổng pre-order ngay cả khi tab đang sleep
    const alarm = window.setTimeout(finish, Math.max(0, end - Date.now()));

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.clearTimeout(alarm);
    };
  }, []);

  // Trigger video mode khi user scroll tới section countdown (chỉ khi countdown đã finished).
  // Một chiều — không reset khi user scroll lên/xuống lại.
  useEffect(() => {
    const section = sectionElRef.current;
    if (!section) return;
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Check finished: nếu data-finished đã được set (xem effect trên) → bật video
          const core = coreRef.current;
          if (core?.dataset.finished === "true") {
            setVideoMode(true);
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={sectionElRef}
      id="countdown"
      className="section-divider cv-auto relative scroll-mt-20 overflow-hidden py-24 md:py-36"
    >
      {/* Nền texture "text-highlight" từ web gốc (center top / cover no-repeat) */}
      <img
        src="/countdown-bg.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top"
        loading="lazy"
        decoding="async"
      />
      {/* Overlay tối nhẹ giữ chữ đọc được trên texture */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/55" />

      <div className="container-c relative z-10">
        <div className="mx-auto max-w-3xl text-center transition-all duration-700 md:max-w-5xl">
          {/* Ẩn title + paragraph khi videoMode để video chiếm trọn spotlight */}
          <div
            className={`transition-all duration-700 ${
              videoMode ? "max-h-0 overflow-hidden opacity-0" : "max-h-[500px] opacity-100"
            }`}
          >
            <Reveal delay={110}>
              <h2 className="section-title section-title-light section-title-plain count-title mt-7">
                EVERY SECOND
                <br />
                <span className="text-accent">COUNTS.</span>
              </h2>
            </Reveal>

            <Reveal delay={220}>
              <p className="mx-auto mt-6 max-w-[52ch] text-sm leading-relaxed text-muted md:text-base">
                Cổng <strong className="text-text">pre-order</strong>{" "}
                <strong className="text-text">GUMAYUSI Collection</strong> chính thức mở ngày{" "}
                <strong className="text-text">22.09.2026</strong>.
              </p>
            </Reveal>
          </div>

          {/* Panel đồng hồ — double-bezel signature. Khi videoMode: mở rộng ra và chứa YouTube embed. */}
          <div
            ref={panelRef}
            className={`count-shell mx-auto mt-12 rounded-[26px] border border-white/10 bg-[#0c0c10] p-[6px] transition-all duration-700 ${
              videoMode ? "max-w-5xl" : ""
            }`}
            style={{ animationDelay: "0.32s" }}
          >
            <div
              ref={coreRef}
              className={`count-core relative overflow-hidden rounded-[20px] px-[clamp(14px,4vw,38px)] pb-[clamp(18px,3.5vw,28px)] pt-[clamp(22px,4vw,34px)] text-center transition-all duration-700 ${
                videoMode ? "aspect-video p-0" : ""
              }`}
              style={{
                ["--count-cell" as string]: "clamp(40px, 10.5vw, 82px)",
                background: videoMode
                  ? "#000"
                  : "linear-gradient(180deg, rgba(236,232,26,0.06) 0%, transparent 150px), radial-gradient(130% 95% at 50% 0%, #111116 0%, #0a0a0e 55%, #060609 100%)",
              }}
            >
              {!videoMode && (
                <>
              <div className="count-halo" />
              <span className="count-corner tl" />
              <span className="count-corner tr" />
              <span className="count-corner bl" />
              <span className="count-corner br" />

              {/* Arc + sunrise */}
              <div className="count-arc-row">
                <svg
                  className="count-arc"
                  viewBox="0 0 460 96"
                  preserveAspectRatio="xMidYMax meet"
                  aria-hidden="true"
                >
                  <defs>
                    <radialGradient id="count-sun-grad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#FFFEF4" />
                      <stop offset="45%" stopColor="#F7EC9B" />
                      <stop offset="100%" stopColor="#ECE81A" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  <path ref={trackRef} className="count-arc-track" d={ARCH} />
                  {NOTCHES.map((n, i) => (
                    <line
                      key={i}
                      className="count-arc-notch"
                      x1={n.x1}
                      y1={n.y1}
                      x2={n.x2}
                      y2={n.y2}
                    />
                  ))}
                  <path ref={fillRef} className="count-arc-fill" d={ARCH} />

                  {/* Vạch đích (destination) — mờ */}
                  <g transform="translate(436 72)">
                    <circle className="count-ghost" r="6" />
                    <circle r="2.6" fill="rgba(255,255,255,0.35)" />
                  </g>

                  {/* Ngôi sao 4 cánh GUMA */}
                  <g ref={sunRef} className="count-sun" transform="translate(24 72)">
                    <circle className="count-sun-halo" r="10" fill="url(#count-sun-grad)" />
                    <g className="count-star-group">
                      <g className="count-star-rays">
                        <line x1="0" y1="-9.5" x2="0" y2="-6.8" />
                        <line x1="0" y1="-9.5" x2="0" y2="-6.8" transform="rotate(90)" />
                        <line x1="0" y1="-9.5" x2="0" y2="-6.8" transform="rotate(180)" />
                        <line x1="0" y1="-9.5" x2="0" y2="-6.8" transform="rotate(270)" />
                      </g>
                      <path className="count-star" d={STAR_PATH} />
                    </g>
                  </g>
                </svg>
              </div>

              {/* Rolling digits */}
              <div
                ref={timerRef}
                role="timer"
                className="count-digits"
                aria-label="Đang đếm ngược"
              >
                {UNITS.map((unit, ui) => (
                  <div key={unit.label} className="count-unit">
                    <div className="count-cells">
                      {[0, 1].map((ci) => {
                        const stripIdx = ui * 2 + ci;
                        return (
                          <div key={ci} className="count-cell">
                            <div
                              className="count-strip"
                              ref={(el) => {
                                stripsRef.current[stripIdx] = el;
                              }}
                            >
                              {Array.from({ length: 10 }, (_, d) => (
                                <span key={d}>{d}</span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <span className="count-unit-label">{unit.label}</span>
                  </div>
                ))}
              </div>

              {/* Road to the star */}
              <div className="count-rail-row">
                <span>Road to the star</span>
                <span className="count-pct" ref={pctRef}>
                  0%
                </span>
              </div>
              <div className="count-rail">
                <div className="count-rail-fill" ref={railRef} style={{ transform: "scaleX(0)" }} />
              </div>
                </>
              )}

              {/* Khi videoMode: hiện YouTube embed thay cho toàn bộ nội dung đồng hồ */}
              {videoMode && (
                <iframe
                  className="absolute inset-0 h-full w-full rounded-[20px]"
                  src="https://www.youtube.com/embed/TrLuWaVNUSc?autoplay=1&rel=0"
                  title="GUMAYUSI Collection"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}