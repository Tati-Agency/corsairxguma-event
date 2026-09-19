"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";
import { EVENT_END_MS, SHOPEE_LINKS } from "@/lib/config";
import { trackClick } from "@/lib/track";

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
const RING_LAP_MS = 4000;
/** Chờ khung bung ra xong mới cho sao chạy. */
const RING_START_DELAY = 600;
/**
 * Mốc chia 2 pha theo quãng đường: 3/5 đầu tăng tốc, 2/5 cuối hãm.
 * Tỉ lệ này quyết định đoạn cuối CHẬM tới đâu — 2/3 thì đoạn cuối chỉ
 * chiếm ~28% thời gian (còn nhanh), 3/5 thì chiếm ~39% (chậm rõ).
 */
const RING_ACCEL_DISTANCE = 3 / 5;
/**
 * Tốc độ đỉnh / tốc độ ban đầu. Đây là lever chính của cảm giác "vọt":
 * 1.35 gần như không thấy khác biệt; ~2.6 cho đoạn giữa nhanh gấp ~2.6 lần
 * lúc xuất phát; >3.5 bắt đầu giật vì đoạn đầu/cuối quá chậm.
 */
const RING_SPEED_GAIN = 2.6;
/**
 * Hình dạng cú hãm ở 2/5 cuối — quyết định cú hãm dồn vào ĐẦU hay CUỐI đoạn:
 *   0.4-0.6 = hãm sốc ngay khi vào đoạn cuối rồi thoải dần (đang dùng 0.5)
 *   1       = giảm đều suốt đoạn cuối
 *   2-3     = giữ tốc độ cao lâu rồi mới tụt sát đích
 *   4+      = gần như phanh gấp đúng lúc về đích
 * Mọi giá trị đều về ĐÚNG tốc độ ban đầu tại s = 1.
 */
const RING_BRAKE_P = 0.5;
/** Số mẫu khi tích phân số dựng bảng easing. */
const RING_TABLE_N = 400;
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

/* ---- Khung tiến trình quanh video ----
   Khung CHỮ NHẬT BO GÓC ôm sát viền khung video, gồm 2 NHÁNH cùng xuất phát
   từ ĐÁY GIỮA và chạy ngược chiều nhau lên ĐỈNH GIỮA:

     nhánh LOGO — CHIỀU KIM ĐỒNG HỒ (sweep-flag 1): vòng qua bên TRÁI.
     nhánh SAO  — NGƯỢC KIM ĐỒNG HỒ (sweep-flag 0): vòng qua bên PHẢI.

   Hai nhánh dài BẰNG NHAU nên chạy cùng tiến độ t sẽ cùng tốc độ và cùng
   lúc tới đích. Đỉnh giữa cố ý KHÔNG nối liền, chừa khoảng hở để đặt dấu X.

   Path dựng theo PIXEL thật của khung (viewBox khớp 1:1, không scale) và
   KHÔNG dùng `vector-effect: non-scaling-stroke`: khi có non-scaling-stroke,
   Chrome tính `stroke-dasharray` theo không gian màn hình còn
   `getTotalLength()` vẫn trả user-unit → hai đơn vị lệch nhau, dash bị sai
   nên vệt vàng hiện sẵn thành nhiều đoạn thay vì lớn dần theo marker.
   Tỉ lệ inset / bo góc giữ nguyên theo thiết kế gốc 160×90. */
const RING_RATIO_INSET_X = 6 / 160;
const RING_RATIO_INSET_Y = 4 / 90;
const RING_RATIO_RADIUS = 5 / 90;
/** Nửa khoảng hở ở đỉnh giữa, theo bề rộng khung — chỗ đặt dấu X neon. */
const RING_TOP_GAP_RATIO = 0.035;

function buildRingPaths(w: number, h: number) {
  const ix = w * RING_RATIO_INSET_X;
  const iy = h * RING_RATIO_INSET_Y;
  const r = h * RING_RATIO_RADIUS;
  const x0 = ix;
  const x1 = w - ix;
  const y0 = iy;
  const y1 = h - iy;
  const cx = w / 2;
  const gapHalf = w * RING_TOP_GAP_RATIO;

  // sweep-flag 1 = chiều kim đồng hồ, 0 = ngược chiều kim đồng hồ
  const logo = [
    `M ${cx} ${y1}`,
    `L ${x0 + r} ${y1}`,
    `A ${r} ${r} 0 0 1 ${x0} ${y1 - r}`,
    `L ${x0} ${y0 + r}`,
    `A ${r} ${r} 0 0 1 ${x0 + r} ${y0}`,
    `L ${cx - gapHalf} ${y0}`,
  ].join(" ");

  const star = [
    `M ${cx} ${y1}`,
    `L ${x1 - r} ${y1}`,
    `A ${r} ${r} 0 0 0 ${x1} ${y1 - r}`,
    `L ${x1} ${y0 + r}`,
    `A ${r} ${r} 0 0 0 ${x1 - r} ${y0}`,
    `L ${cx + gapHalf} ${y0}`,
  ].join(" ");

  return { logo, star, gapHalf };
}

/* ---- Easing cho ngôi sao (vận tốc cho theo QUÃNG ĐƯỜNG s) ----
   Chia 2 pha, đỉnh vận tốc đúng tại mốc RING_ACCEL_DISTANCE (= 3/5):

     pha tăng tốc  (s ≤ A):  v = v0 + d·smoothstep(s / A)
       → vào êm (đạo hàm 0 tại s=0) rồi tăng dần tới đỉnh.

     pha hãm       (s > A):  v = v0 + d·(1 - u^BRAKE_P),  u = (s-A)/(1-A)
       → giảm dần và về ĐÚNG tốc độ ban đầu tại s = 1.
         BRAKE_P = 1 → giảm đều cả đoạn cuối (đoạn cuối chậm thật);
         BRAKE_P lớn → giữ tốc độ cao lâu rồi mới tụt sát đích.

   (Bản đầu dùng v = v0 + d·sin(π·s^P) với mốc 2/3 — giảm tốc trải đều cả
   1/3 cuối nên đoạn cuối vẫn nhanh, nhìn không ra cú hãm.)

   Vì v cho theo quãng đường nên phải tích phân số để đổi sang thời gian
   (t = ∫ ds/v), rồi tra ngược bảng để biết tại thời điểm t đã đi được bao
   xa. Bảng dựng 1 lần ở module scope nên không tốn gì lúc chạy. */
const RING_EASE_TABLE = (() => {
  const v0 = 1;
  const d = RING_SPEED_GAIN - 1;
  const accel = RING_ACCEL_DISTANCE;
  const speed = (s: number) => {
    if (s <= accel) {
      const u = s / accel;
      return v0 + d * (u * u * (3 - 2 * u)); // smoothstep
    }
    const u = (s - accel) / (1 - accel);
    return v0 + d * (1 - Math.pow(u, RING_BRAKE_P));
  };

  const ts: number[] = [0];
  const ss: number[] = [0];
  let t = 0;
  const ds = 1 / RING_TABLE_N;
  for (let i = 1; i <= RING_TABLE_N; i++) {
    const sPrev = (i - 1) * ds;
    const sCur = i * ds;
    // hình thang, lấy vận tốc tại trung điểm đoạn
    t += ds / speed((sPrev + sCur) / 2);
    ts.push(t);
    ss.push(sCur);
  }
  // chuẩn hoá để tổng thời gian = 1
  for (let i = 0; i < ts.length; i++) ts[i] /= t;
  return { ts, ss };
})();

/** Quãng đường đã đi tại thời điểm t (0..1) — tra bảng + nội suy tuyến tính. */
function ringEase(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const { ts, ss } = RING_EASE_TABLE;
  let lo = 0;
  let hi = ts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ts[mid] <= t) lo = mid;
    else hi = mid;
  }
  const span = ts[hi] - ts[lo] || 1;
  return ss[lo] + (ss[hi] - ss[lo]) * ((t - ts[lo]) / span);
}

/**
 * Đặt 1 marker (logo hoặc sao) lên đúng đường path của nó theo tiến độ t
 * (0..1). Dùng getPointAtLength nên marker chạy khít theo viền bo góc.
 */
function placeOnPath(
  el: HTMLElement,
  path: SVGPathElement,
  t: number,
  total: number,
  w: number,
  h: number
) {
  const pt = path.getPointAtLength(t * total);
  el.style.left = `${((pt.x / w) * 100).toFixed(3)}%`;
  el.style.top = `${((pt.y / h) * 100).toFixed(3)}%`;
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
  const ringWrapRef = useRef<HTMLDivElement>(null);
  const ringFillLogoRef = useRef<SVGPathElement>(null);
  const ringFillStarRef = useRef<SVGPathElement>(null);
  const ringGlowLogoRef = useRef<SVGPathElement>(null);
  const ringGlowStarRef = useRef<SVGPathElement>(null);
  const ringLogoRef = useRef<HTMLDivElement>(null);
  const ringStarRef = useRef<HTMLDivElement>(null);
  /** Kích thước thật (px) của khung — dùng để dựng path đúng đơn vị. */
  const [ringBox, setRingBox] = useState({ w: 0, h: 0 });
  /** Cả 2 marker đã về đích → hiện dấu X neon ở khoảng hở trên đỉnh. */
  const [ringDone, setRingDone] = useState(false);
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

  // Chỉ mount iframe khi section vào viewport — tránh video tự chạy ngoài
  // màn hình. Video có mặt ở MỌI phase (nằm trên khung đồng hồ).
  useEffect(() => {
    if (inView) setVideoMounted(true);
  }, [inView]);

  // Đo kích thước thật của khung để dựng path theo pixel (xem buildRingPath).
  // Đo ngay từ đầu (không đợi reveal) để lúc reveal không bị trễ 1 frame.
  useEffect(() => {
    const el = ringWrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setRingBox((prev) =>
        Math.abs(prev.w - r.width) < 1 && Math.abs(prev.h - r.height) < 1
          ? prev
          : { w: Math.round(r.width), h: Math.round(r.height) }
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Animation khung: logo chạy chiều kim đồng hồ (bên trái), sao chạy ngược
  // chiều kim đồng hồ (bên phải) — cả hai xuất phát từ ĐÁY GIỮA, cùng tiến độ
  // nên cùng tốc độ, gặp nhau ở ĐỈNH GIỮA và chừa khoảng hở cho dấu X.
  // Vệt vàng mỗi bên lớn dần đúng tới vị trí marker của nó.
  useEffect(() => {
    if (phase !== "reveal") return;
    const logoFill = ringFillLogoRef.current;
    const starFill = ringFillStarRef.current;
    const logoGlow = ringGlowLogoRef.current;
    const starGlow = ringGlowStarRef.current;
    const logo = ringLogoRef.current;
    const star = ringStarRef.current;
    if (!logoFill || !starFill || !logoGlow || !starGlow || !logo || !star) return;
    const { w, h } = ringBox;
    if (!w || !h) return;

    // Thứ tự [logo, sao] dùng chung cho cả 3 mảng bên dưới
    const fills = [logoFill, starFill] as const;
    const glows = [logoGlow, starGlow] as const;
    const markers = [logo, star] as const;
    const totals = [logoFill.getTotalLength(), starFill.getTotalLength()] as const;
    if (!totals[0] || !totals[1]) return;

    // Quầng dùng CHUNG dasharray với vệt chính nên luôn trùng khít nhau
    for (let i = 0; i < 2; i++) {
      fills[i].style.strokeDasharray = `${totals[i]}`;
      glows[i].style.strokeDasharray = `${totals[i]}`;
    }

    /** Đặt 2 marker + 2 vệt sáng (kèm quầng) theo cùng tiến độ e. */
    const apply = (e: number) => {
      for (let i = 0; i < 2; i++) {
        const offset = `${totals[i] * (1 - e)}`;
        fills[i].style.strokeDashoffset = offset;
        glows[i].style.strokeDashoffset = offset;
        placeOnPath(markers[i], fills[i], e, totals[i], w, h);
      }
    };

    // Phiên trước đã reveal, hoặc user bật giảm chuyển động
    // → hiện thẳng trạng thái hoàn tất, không chạy animation.
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (skipRingAnimRef.current || reduceMotion) {
      apply(1);
      setRingDone(true);
      return;
    }

    setRingDone(false);
    apply(0);

    let raf = 0;
    const startAt = performance.now() + RING_START_DELAY;

    const loop = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - startAt) / RING_LAP_MS));
      apply(ringEase(t));
      if (t < 1) {
        raf = requestAnimationFrame(loop);
      } else {
        setRingDone(true); // cả 2 đã dừng ở đỉnh → hiện dấu X
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, ringBox.w, ringBox.h]);

  // Path 2 nhánh — dựng theo pixel thật của khung; khi chưa đo được thì để
  // rỗng (SVG cũng chưa render, xem điều kiện ringBox.w > 0 bên dưới).
  const ringPaths =
    ringBox.w > 0 && ringBox.h > 0
      ? buildRingPaths(ringBox.w, ringBox.h)
      : { logo: "", star: "", gapHalf: 0 };

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

          {/* VIDEO YOUTUBE — LUÔN nằm NGAY TRÊN khung đồng hồ (kể cả khi
              countdown còn đang chạy). Khung tiến trình + ngôi sao chỉ được
              thêm vào sau khi countdown kết thúc và user cuộn tới (reveal).
              Vì video luôn ở cùng một vị trí trong cây DOM nên khi chuyển
              phase nó KHÔNG bị unmount → không bị phát lại từ đầu. */}
          <div
            className={`count-ring mt-10 ${phase === "reveal" ? "count-ring--in" : ""}`}
            ref={ringWrapRef}
          >
            {/* Chỉ render sau khi đo được kích thước — tránh viewBox rỗng */}
            {phase === "reveal" && ringBox.w > 0 && (
              <svg
                className="count-ring-svg"
                viewBox={`0 0 ${ringBox.w} ${ringBox.h}`}
                aria-hidden="true"
              >
                {/* 2 nhánh, không vẽ track nền — đường chỉ "sinh ra" đúng tới
                    đâu marker của nó đi qua tới đó.
                    Mỗi nhánh gồm 2 path: QUẦNG (nét to, mờ) + VỆT CHÍNH (nét
                    mảnh, sáng), dùng chung dash offset nên trùng khít. Làm
                    quầng bằng path thay vì filter drop-shadow để khỏi phải
                    blur lại toàn khung mỗi frame. */}
                <path ref={ringGlowLogoRef} className="count-ring-glow" d={ringPaths.logo} />
                <path ref={ringFillLogoRef} className="count-ring-fill" d={ringPaths.logo} />
                <path ref={ringGlowStarRef} className="count-ring-glow" d={ringPaths.star} />
                <path ref={ringFillStarRef} className="count-ring-fill" d={ringPaths.star} />
              </svg>
            )}

            {/* Khung video — nằm gọn bên trong khung tiến trình.
                inset khớp với RING_RATIO_INSET (x 6/160 = 3.75%, y 4/90 =
                4.44% + chừa khe) để đường viền ôm sát quanh video. */}
            <div className="absolute inset-x-[5.6%] inset-y-[7.8%] overflow-hidden rounded-[12px] border border-white/15 bg-black md:rounded-[18px]">
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

            {/* 2 marker chạy dọc viền khung — vị trí do rAF cập nhật.
                Cả hai xuất phát từ ĐÁY GIỮA (50%, 95.556% ~ sát mép dưới). */}
            {phase === "reveal" && (
              <>
                {/* Logo CORSAIR — chạy CHIỀU KIM ĐỒNG HỒ (vòng bên trái).
                    Tô vàng bằng CSS mask: nền accent + mask chính file SVG,
                    vì logo là ảnh nhúng base64 nên không đổi fill được. */}
                <div
                  ref={ringLogoRef}
                  className="count-ring-marker"
                  style={{ left: "50%", top: "95.556%" }}
                >
                  <span className="count-ring-halo" aria-hidden="true" />
                  <span className="count-ring-logo" aria-hidden="true" />
                </div>

                {/* Ngôi sao GUMA — chạy NGƯỢC KIM ĐỒNG HỒ (vòng bên phải) */}
                <div
                  ref={ringStarRef}
                  className="count-ring-marker"
                  style={{ left: "50%", top: "95.556%" }}
                >
                  <span className="count-ring-halo" aria-hidden="true" />
                  <svg width="26" height="26" viewBox="-8 -8 16 16" aria-hidden="true">
                    <path d={STAR_PATH} />
                  </svg>
                </div>
              </>
            )}

            {/* Dấu X neon ở khoảng hở đỉnh giữa — hiện khi cả 2 marker về đích */}
            {phase === "reveal" && ringDone && (
              <div className="count-ring-x" style={{ left: "50%", top: "4.444%" }}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <line x1="5" y1="5" x2="19" y2="19" />
                  <line x1="19" y1="5" x2="5" y2="19" />
                </svg>
              </div>
            )}

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

          {/* Link Shopee — CHỈ render ở phase reveal, tức là SAU khi đồng hồ về
              0. Đúng thể lệ "link mở ở đồng hồ đếm ngược vào 0h 22/09": trước
              mốc đó không có gì trong DOM nên link không bị lộ khi sản phẩm
              chưa mở bán. */}
          {phase === "reveal" && (
            <div className="mt-8 md:mt-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted md:text-sm">
                Đặt trước tại Shopee · Gian hàng chính hãng CORSAIR
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                {SHOPEE_LINKS.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackClick(link.id)}
                    className="group flex items-center gap-2 border border-accent bg-black/70 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-accent backdrop-blur transition-all hover:bg-accent hover:text-black md:text-sm"
                  >
                    <span>{link.label}</span>
                    <span
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Panel đồng hồ — đóng lại (thu nhỏ) rồi biến mất khi reveal */}
          {phase !== "reveal" && (
            <div
              ref={panelRef}
              className={`count-shell mx-auto mt-4 rounded-[26px] border border-white/10 bg-[#0c0c10] p-[6px] ${
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

        </div>
      </div>
    </section>
  );
}
