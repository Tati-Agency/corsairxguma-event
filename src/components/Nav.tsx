"use client";

import { useEffect, useState } from "react";
import { loadPassFromLocal } from "@/lib/checkin";

export default function Nav() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setCheckedIn(loadPassFromLocal() !== null);
    // rAF-throttled scroll handler — avoids a state update per scroll event
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setScrolled(window.scrollY > 24);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 nav-blur transition-shadow ${
        scrolled ? "shadow-[0_1px_0_rgba(255,212,0,0.1)]" : ""
      }`}
    >
      <div className="container-c flex h-16 md:h-20 items-center justify-between">
        <a href="#top" className="-ml-2 md:-ml-4 flex items-center group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/corsairxguma.svg"
            alt="CORSAIR × GUMAYUSI"
            className="h-14 w-auto md:h-16 transition-opacity group-hover:opacity-80"
          />
        </a>
        <a
          href="#checkin"
          className="btn-accent !py-2 !px-4 text-xs md:text-sm rounded-full"
        >
          {checkedIn ? "Event Pass" : "Check In"}
          <span className="arrow">→</span>
        </a>
      </div>
    </header>
  );
}
