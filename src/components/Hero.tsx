"use client";

import { useEffect, useRef } from "react";
import Reveal from "./Reveal";

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);

  // Pause the drifting aura while the hero is off-screen (scroll perf)
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => section.toggleAttribute("data-idle", !entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="top" className="hero">
      {/* Preload cả 2 ảnh — desktop ưu tiên để LCP mượt */}
      <link rel="preload" as="image" href="/img-bg-landscape.png" media="(min-width: 768px)" />
      <link rel="preload" as="image" href="/img-bg-portrait.png" media="(max-width: 767px)" />

      {/* Background image — 2 ảnh riêng theo breakpoint
          (mobile dùng portrait, desktop dùng landscape).
          object-position đặt center để bạn tinh chỉnh vị trí crop sau. */}
      <div className="absolute inset-0 z-0">
        {/* Mobile: portrait */}
        <img
          src="/img-bg-portrait.png"
          alt="Gumayusi, League of Legends pro player, focused at his gaming setup in a CORSAIR jersey in a neon-lit room"
          className="h-full w-full object-cover object-center brightness-[0.6] md:hidden"
          fetchPriority="high"
          decoding="async"
        />
        {/* Desktop: landscape */}
        <img
          src="/img-bg-landscape.png"
          alt="Gumayusi, League of Legends pro player, focused at his gaming setup in a CORSAIR jersey in a neon-lit room"
          className="hidden h-full w-full object-cover object-center brightness-100 md:block"
          fetchPriority="high"
          decoding="async"
        />
        {/* Overlay: mobile dốc dưới-lên (đậm đáy, nhạt đỉnh), desktop gradient ngang */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-transparent md:bg-gradient-to-r md:from-bg/90 md:via-bg/60 md:to-transparent" />
      </div>

      <div className="hero-aura">
        <div className="scanline" />
      </div>

      <span className="corner-bracket tl" />
      <span className="corner-bracket tr" />
      <span className="corner-bracket bl" />
      <span className="corner-bracket br" />

      {/* Desktop (md+): nội dung canh trái, subhead 2 hàng ngang, nút canh trái ngay dưới.
          Mobile: giữ layout cũ — nội dung căn giữa, đặt ở đáy hero */}
      <div className="container-c relative z-10 flex min-h-[92svh] flex-col items-center justify-end pb-16 pt-28 text-center md:flex-col md:items-start md:justify-end md:pb-20 md:text-left">
        {/* Subhead — mobile: 1 dòng ngang. Desktop: 2 hàng ngang rõ ràng */}
        <h1 className="hero-title md:flex md:flex-col md:items-start md:gap-1">
          <span
            className="hero-subhead hero-line"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="md:hidden">I&apos;LL PROVE IT, EVERY GAME</span>
            <span className="hidden md:inline md:block">I&apos;LL PROVE IT,</span>
            <span className="hidden md:inline md:block">EVERY GAME</span>
          </span>
        </h1>

        <Reveal delay={240} className="mt-8 flex flex-row flex-wrap items-center justify-center gap-4 md:mt-6 md:justify-start">
          <a href="#register" className="btn-accent">
            [ Đăng ký LUCKYDRAW ]
            <span className="arrow">→</span>
          </a>
          <a href="#excellence" className="btn-ghost hidden md:inline-flex">
            Road to Excellence
          </a>
        </Reveal>
      </div>
    </section>
  );
}
