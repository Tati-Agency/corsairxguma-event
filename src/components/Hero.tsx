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
      {/* Preload the hero image (LCP) */}
      <link rel="preload" as="image" href="/guma-hero.png" />

      {/* Background image — hero mới từ web gốc (1 ảnh cho cả breakpoint).
          object-position 55% 0% và mobile brightness giảm như bản gốc. */}
      <div className="absolute inset-0 z-0">
        <img
          src="/guma-hero.png"
          alt="Gumayusi, League of Legends pro player, focused at his gaming setup in a CORSAIR jersey in a neon-lit room"
          className="h-full w-full object-cover object-[50%_0%] brightness-[0.6] md:translate-x-0 md:object-[55%_0%] md:brightness-100"
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

      {/* Layout đúng bản gốc: nội dung căn giữa, đặt ở đáy hero */}
      <div className="container-c relative z-10 flex min-h-[92svh] flex-col items-center justify-end pb-16 pt-28 text-center">
        <h1 className="hero-title">
          <span
            className="hero-subhead hero-line"
            style={{ animationDelay: "0.1s" }}
          >
            I&apos;LL PROVE IT, EVERY GAME
          </span>
          <img
            src="/logos/logo-corsairxguma.png"
            alt="CORSAIR x GUMAYUSI"
            className="hero-logo hero-line mx-auto"
            style={{ animationDelay: "0.25s" }}
          />
        </h1>

        <Reveal delay={240} className="mt-8 flex flex-row flex-wrap items-center justify-center gap-4">
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
