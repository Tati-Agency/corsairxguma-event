"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";

const SLIDES = [
  "https://assets.corsair.com/image/upload/f_auto/q_auto/v1768188103/akamai/landing/Gumayusi/guma-gallery-01.png",
  "https://assets.corsair.com/image/upload/f_auto/q_auto/v1768188102/akamai/landing/Gumayusi/guma-gallery-02.png",
  "https://assets.corsair.com/image/upload/f_auto/q_auto/v1768269010/akamai/landing/Gumayusi/guma-gallery-03.png",
  "https://assets.corsair.com/image/upload/f_auto/q_auto/v1768269020/akamai/landing/Gumayusi/guma-gallery-04.png",
];

/** Render 3 copies of the set so we can teleport between copies seamlessly. */
const COPIES = 3;
/** Must match the `gap-4` (1rem) on the track. */
const GAP = 16;

export default function MakeMoment() {
  const trackRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const normTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);

  const stepWidth = (track: HTMLDivElement) =>
    (track.querySelector("div")?.offsetWidth ?? 400) + GAP;

  /** Keep scrollLeft inside the middle copy — identical content, so seamless. */
  const normalize = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const setWidth = track.scrollWidth / COPIES;
    if (track.scrollLeft >= setWidth * 2) {
      track.scrollLeft -= setWidth;
    } else if (track.scrollLeft < setWidth) {
      track.scrollLeft += setWidth;
    }
  }, []);

  /** Debounced normalize — runs once scrolling (smooth or manual) settles. */
  const scheduleNormalize = useCallback(() => {
    if (normTimer.current) clearTimeout(normTimer.current);
    normTimer.current = setTimeout(normalize, 200);
  }, [normalize]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // Start in the middle copy so we can scroll both directions freely
    track.scrollLeft = track.scrollWidth / COPIES;

    const onScroll = () => scheduleNormalize();
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      if (normTimer.current) clearTimeout(normTimer.current);
    };
  }, [scheduleNormalize]);

  /** Advance by exactly one card, in either direction, forever. */
  const scrollCards = useCallback((dir: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({
      left: track.scrollLeft + dir * stepWidth(track),
      behavior: "smooth",
    });
  }, []);

  // Track whether the gallery is actually on screen — no work while off-screen
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Auto-advance — only while visible and the tab is not hidden
  useEffect(() => {
    if (paused || !inView) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      scrollCards(1);
    }, 3500);
    return () => clearInterval(timer);
  }, [paused, inView, scrollCards]);

  return (
    <section
      ref={sectionRef}
      className="section-divider cv-auto py-16 md:py-32"
    >
      <div className="container-c">
        <Reveal>
          <div
            className="relative mt-14"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* Scroll track */}
            <div
              ref={trackRef}
              className="flex gap-4 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory"
              style={{ scrollbarWidth: "none" }}
            >
              {/* 3 copies of the set — teleports between copies stay invisible */}
              {Array.from({ length: COPIES }).flatMap((_, copy) =>
                SLIDES.map((src, i) => (
                  <div
                    key={`${copy}-${src}`}
                    className="w-[85vw] shrink-0 snap-center sm:w-[70vw] md:w-[45vw] lg:w-[32vw]"
                  >
                    <div className="aspect-[16/10] overflow-hidden rounded-xl">
                      <img
                        src={src}
                        alt={`Gallery ${i + 1}`}
                        className="h-full w-full object-cover object-center transition-transform duration-500 hover:scale-105"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Left arrow */}
            <button
              type="button"
              onClick={() => scrollCards(-1)}
              className="absolute left-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-black transition-transform hover:scale-110 md:left-4"
              aria-label="Previous"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            {/* Right arrow */}
            <button
              type="button"
              onClick={() => scrollCards(1)}
              className="absolute right-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-black transition-transform hover:scale-110 md:right-4"
              aria-label="Next"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>

            {/* Fade edges */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-bg to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-bg to-transparent" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}