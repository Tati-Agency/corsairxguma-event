import { EVENT } from "@/lib/config";
import Reveal from "./Reveal";

export default function Hero() {
  return (
    <section id="top" className="hero">
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
        <div className="absolute inset-0 bg-gradient-to-r from-bg/90 via-bg/60 to-transparent" />
      </div>

      <div className="hero-aura">
        <div className="scanline" />
      </div>

      <span className="corner-bracket tl" />
      <span className="corner-bracket tr" />
      <span className="corner-bracket bl" />
      <span className="corner-bracket br" />

      <div className="container-c relative z-10 flex min-h-[92vh] flex-col justify-center py-28">
        {/* Title reveals line-by-line on load (pure CSS, runs pre-hydration) */}
        <h1 className="hero-title">
          <span className="hero-line" style={{ animationDelay: "0.1s" }}>
            READY TO
          </span>
          <span
            className="hero-line accent"
            style={{ animationDelay: "0.25s" }}
          >
            ENTER?
          </span>
        </h1>

        <Reveal delay={120}>
          <p className="mt-7 max-w-xl text-base md:text-lg text-muted leading-relaxed">
            Sự kiện gặp gỡ {EVENT.title} — một ngày chỉ dành cho fan.
            Check-in, trải nghiệm gear đỉnh cao và giữ lại khoảnh khắc của riêng bạn.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-10 flex flex-wrap gap-4">
            <a href="#checkin" className="btn-accent">
              [ Enter Event ]
              <span className="arrow">→</span>
            </a>
            <a href="#arena" className="btn-ghost">
              Khám phá khu vực
            </a>
          </div>
        </Reveal>

        <Reveal delay={360}>
          <div className="mt-14 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted">
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
