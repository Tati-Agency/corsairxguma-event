"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";
import { EVENT_END_MS } from "@/lib/config";

/* ============================================================
   GUMA Countdown — "ROAD TO THE STAR"

   Luồng:
   1. phase "clock"  — đồng hồ đếm ngược bình thường (rail thẳng + sao chạy).
   2. phase "closing"— countdown finished + user cuộn tới section:
                       khung đồng hồ ĐÓNG LẠI (thu nhỏ dần rồi mất).
   3. phase "reveal" — panel mới bung ra: video YouTube ở trên, và một vòng
                       tròn ngôi sao ÔM QUANH khung video. Vòng sáng dần đúng
                       theo vệt ngôi sao chạy 1 vòng NGƯỢC KIM ĐỒNG HỒ rồi
                       về đúng điểm xuất phát (đỉnh).

   Trạng thái "đã reveal" lưu ở sessionStorage: F5 trong cùng phiên không
   chạy lại animation; đóng tab mở lại thì chạy lại từ đầu.

   Perf: rAF chỉ chạy khi trong viewport (IntersectionObserver).
   ============================================================ */

const TARGET_MS = EVENT_END_MS; // single source of truth từ lib/config.ts
const TARGET = new Date(TARGET_MS);
const WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // cửa sổ 14 ngày

/** Thời gian khung đồng hồ đóng lại (khớp keyframes count-close trong CSS). */
const CLOSE_MS = 650;
/** Thời gian ngôi sao chạy 1 vòng quanh video. */
const RING_LAP_MS = 2600;
/** Chờ vòng tròn bung ra xong mới cho sao chạy. */
const RING_START_DELAY = 500;
/** Cờ sessionStorage đánh dấu đã reveal. */
const REVEAL_KEY = "cxg_countdown_revealed";

// Đường chạy của ngôi sao giai đoạn đếm ngược — thẳng
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

/* ---- Vòng tròn quanh video (toạ độ user-unit, viewBox 160×90) ----
   Bắt đầu tại ĐỈNH (80, 4), vẽ ngược kim đồng hồ (sweep-flag 0) nên vệt
   sáng cũng lớn dần theo chiều ngược kim đồng hồ, khớp chiều ngôi sao. */
const RING_VB_W = 160;
const RING_VB_H = 90;
const RING_CX = 80;
const RING_CY = 45;
const RING_RX = 76;
const RING_RY = 41;
const RING_PATH = `M ${RING_CX} ${RING_CY - RING_RY} A ${RING_RX} ${RING_RY} 0 0 0 ${RING_CX} ${RING_CY + RING_RY} A ${RING_RX} ${RING_RY} 0 0 0 ${RING_CX} ${RING_CY - RING_RY}`;

/** Đặt ngôi sao lên vòng theo tiến độ t (0..1), chạy ngược kim đồng hồ. */
function placeStar(el: HTMLElement, t: number) {
  const deg = -90 - 360 * t;
  const rad = (deg * Math.PI) / 180;
  const x = RING_CX + RING_RX * Math.cos(rad);
  const y = RING_CY + RING_RY * Math.sin(rad);
  el.style.left = `${((x / RING_VB_W) * 100).toFixed(3)}%`;
  el.style.top = `${((y / RING_VB_H) * 100).toFixed(3)}%`;
}

const UNITS = [
  { label: "Ngày", cellCount: 2 },
  { label: "Giờ", cellCount: 2 },
  { label: "Phút", cellCount: 2 },
  { label: "Giây", cellCount: 2 },
];

function pad2(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

type Phase = "clock" | "closing" | "reveal";

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
  const ringFillRef = useRef<SVGPathElement>(null);
  const ringStarRef = useRef<HTMLDivElement>(null);
  /** true khi phiên này đã reveal trước đó (sessionStorage) → bỏ qua animation. */
  const skipRingAnimRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("clock");
  const [inView, setInView] = useState(false);
  /** Đồng hồ đã về 0 (được set từ vòng lặp rAF bên dưới). */
  const [clockFinished, setClockFinished] = useState(() => Date.now() >= TARGET_MS);
  /** Chỉ mount iframe YouTube khi panel đã reveal VÀ section trong viewport. */
  const [videoMounted, setVideoMounted] = useState(false);
  /** Toggle mute — bắt buộc phải có user gesture để bật tiếng (chính sách YouTube). */
  const [unmuted, setUnmuted] = useState(false);

  // Đọc cờ phiên: đã reveal rồi thì vào thẳng trạng thái cuối.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(REVEAL_KEY) === "1") {
        skipRingAnimRef.current = true;
        setPhase("reveal");
      }
    } catch {
      /* private mode — bỏ qua, chạy animation bình thường */
    }
  }, []);

  useEffect(() => {
    if (phase !== "clock") return;
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
      setClockFinished(true);
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
  }, [phase]);

  // Theo dõi section trong viewport — dùng cho cả trigger reveal và mount iframe.
  useEffect(() => {
    const section = sectionElRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return;
    // threshold thấp: section khá cao, màn nhỏ khó đạt tỉ lệ lớn
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 }
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  // Đếm ngược xong + user đã cuộn tới → bắt đầu đóng khung đồng hồ.
  useEffect(() => {
    if (phase !== "clock") return;
    if (!inView || !clockFinished) return;
    setPhase("closing");
  }, [phase, inView, clockFinished]);

  // Đang đóng → sau CLOSE_MS thì bung panel reveal và ghi cờ phiên.
  useEffect(() => {
    if (phase !== "closing") return;
    const t = window.setTimeout(() => {
      setPhase("reveal");
      try {
        sessionStorage.setItem(REVEAL_KEY, "1");
      } catch {
        /* private mode */
      }
    }, CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  // Chỉ mount iframe khi thật sự cần — tránh video tự chạy ngoài màn hình.
  useEffect(() => {
    if (phase === "reveal" && inView) setVideoMounted(true);
  }, [phase, inView]);

  // Animation vòng tròn: sao chạy 1 vòng ngược kim đồng hồ, vệt sáng theo chân.
  useEffect(() => {
    if (phase !== "reveal") return;
    const path = ringFillRef.current;
    const star = ringStarRef.current;
    if (!path || !star) return;

    const total = path.getTotalLength();
    path.style.strokeDasharray = `${total}`;

    // Phiên trước đã reveal, hoặc user bật giảm chuyển động
    // → hiện thẳng trạng thái hoàn tất, không chạy animation.
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (skipRingAnimRef.current || reduceMotion) {
      path.style.strokeDashoffset = "0";
      placeStar(star, 1);
      return;
    }

    path.style.strokeDashoffset = `${total}`;
    placeStar(star, 0);

    const smooth = (t: number) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    let raf = 0;
    const startAt = performance.now() + RING_START_DELAY;

    const loop = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - startAt) / RING_LAP_MS));
      const e = smooth(t);
      placeStar(star, e);
      path.style.strokeDashoffset = `${total * (1 - e)}`;
      if (t < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

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
        <div className="mx-auto max-w-3xl text-center transition-all duration-700 md:max-w-6xl">
          {/* Ẩn title + paragraph khi reveal để vòng tròn có đủ không gian */}
          <div
            className={`transition-all duration-700 ${
              phase === "reveal" ? "max-h-0 overflow-hidden opacity-0" : "max-h-[500px] opacity-100"
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

          {/* Panel đồng hồ — đóng lại (thu nhỏ) khi chuyển sang reveal */}
          {phase !== "reveal" && (
            <div
              ref={panelRef}
              className={`count-shell mx-auto mt-12 rounded-[26px] border border-white/10 bg-[#0c0c10] p-[6px] ${
                phase === "closing" ? "count-shell--closing" : ""
              }`}
              style={{ animationDelay: "0.32s" }}
            >
              <div
                ref={coreRef}
                className="count-core relative overflow-hidden rounded-[20px] px-[clamp(14px,4vw,38px)] pb-[clamp(18px,3.5vw,28px)] pt-[clamp(22px,4vw,34px)] text-center"
                style={{
                  ["--count-cell" as string]: "clamp(40px, 10.5vw, 82px)",
                  background:
                    "linear-gradient(180deg, rgba(236,232,26,0.06) 0%, transparent 150px), radial-gradient(130% 95% at 50% 0%, #111116 0%, #0a0a0e 55%, #060609 100%)",
                }}
              >
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
              </div>
            </div>
          )}

          {/* Reveal — video YouTube ở trên, vòng tròn ngôi sao ôm quanh khung video */}
          {phase === "reveal" && (
            <div className="count-reveal mt-8">
              <div className="count-ring">
                <svg
                  className="count-ring-svg"
                  viewBox={`0 0 ${RING_VB_W} ${RING_VB_H}`}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path className="count-ring-track" d={RING_PATH} />
                  <path ref={ringFillRef} className="count-ring-fill" d={RING_PATH} />
                </svg>

                {/* Khung video — nằm gọn bên trong vòng tròn */}
                <div className="absolute inset-x-[6%] inset-y-[7%] overflow-hidden rounded-[18px] bg-black">
                  {videoMounted && (
                    <iframe
                      key={unmuted ? "unmuted" : "muted"}
                      className="absolute inset-0 h-full w-full"
                      src={`https://www.youtube.com/embed/TrLuWaVNUSc?autoplay=1&mute=${unmuted ? 0 : 1}&rel=0&playsinline=1`}
                      title="GUMAYUSI Collection"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  )}
                </div>

                {/* Ngôi sao chạy trên vòng — vị trí do rAF cập nhật */}
                <div
                  ref={ringStarRef}
                  className="count-ring-star"
                  style={{ left: "50%", top: "4.444%" }}
                >
                  <svg width="26" height="26" viewBox="-8 -8 16 16" aria-hidden="true">
                    <path d={STAR_PATH} />
                  </svg>
                </div>

                {/* Toggle bật/tắt tiếng — desktop góc trên-phải, mobile giữa-dưới video */}
                <button
                  type="button"
                  onClick={() => setUnmuted((v) => !v)}
                  aria-label={unmuted ? "Tắt tiếng video" : "Bật tiếng video"}
                  className="absolute z-10 flex items-center gap-2 rounded-full border border-accent bg-black/70 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-accent backdrop-blur transition-all hover:bg-accent hover:text-black left-1/2 bottom-[10%] -translate-x-1/2 md:left-auto md:right-[8%] md:top-[10%] md:bottom-auto md:translate-x-0 md:translate-y-0"
                >
                  {unmuted ? (
                    /* Speaker ON (có tiếng) */
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                  ) : (
                    /* Speaker MUTED (tắt tiếng) */
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  )}
                  <span className="md:inline">{unmuted ? "Tắt tiếng" : "Bật tiếng"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
