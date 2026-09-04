"use client";

import { useEffect, useRef } from "react";
import { EVENT } from "@/lib/config";
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
      {/* Preload the hero image for the current breakpoint (LCP) */}
      <link
        rel="preload"
        as="image"
        href="/guma-hero-desktop.png"
        media="(min-width: 768px)"
      />
      <link
        rel="preload"
        as="image"
        href="/guma-hero-mobile.png"
        media="(max-width: 767px)"
      />

      {/* Background image — one file per breakpoint (no double download) */}
      <div className="absolute inset-0 z-0">
        <picture>
          <source media="(min-width: 768px)" srcSet="/guma-hero-desktop.png" />
          <img
            src="/guma-hero-mobile.png"
            alt="CORSAIR x GUMAYUSI"
            className="h-full w-full object-cover object-[55%_0%]"
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        {/* Overlay: mobile đậm hơn (text đè lên ảnh full-bleed), desktop giữ nguyên */}
        <div className="absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/80 to-bg/25 md:from-bg/90 md:via-bg/60 md:to-transparent" />
      </div>

      <div className="hero-aura">
        <div className="scanline" />
      </div>

      <span className="corner-bracket tl" />
      <span className="corner-bracket tr" />
      <span className="corner-bracket bl" />
      <span className="corner-bracket br" />

      <div className="container-c relative z-10 flex min-h-[92svh] flex-col justify-center py-28">
        {/* Title reveals line-by-line on load (pure CSS, runs pre-hydration) */}
        <h1 className="hero-title">
          <span
            className="hero-subhead hero-line"
            style={{ animationDelay: "0.1s" }}
          >
            PRE-ORDER
          </span>
          <span
            className="hero-main hero-line"
            style={{ animationDelay: "0.25s" }}
          >
            CORSAIR <span className="hero-x">x</span>
          </span>
          <span
            className="hero-main hero-line"
            style={{ animationDelay: "0.4s" }}
          >
            GUMAYUSI
          </span>
        </h1>

        <Reveal delay={120}>
          <p className="mt-5 max-w-xl text-base text-muted leading-relaxed md:mt-7 md:text-lg">
            Sự kiện gặp gỡ {EVENT.title} — một ngày chỉ dành cho fan.
            Check-in, trải nghiệm gear đỉnh cao và giữ lại khoảnh khắc của riêng bạn.
          </p>
        </Reveal>

        <Reveal delay={240}>
          {/* Mobile: nút stack dọc full-width — touch target to, dễ bấm; desktop: ngang */}
          <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-4">
            <a href="#checkin" className="btn-accent w-full sm:w-auto">
              [ Enter Event ]
              <span className="arrow">→</span>
            </a>
            <a href="#arena" className="btn-ghost w-full sm:w-auto">
              Khám phá khu vực
            </a>
          </div>
        </Reveal>

        <Reveal delay={360}>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted md:mt-14">
            <span className="flex items-center gap-2">
              <span className="text-accent">▸</span> {EVENT.date}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-accent">▸</span> {EVENT.time}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-accent">▸</span> {EVENT.venue}
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
