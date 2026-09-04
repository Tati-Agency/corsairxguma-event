"use client";

import { useEffect, useState } from "react";

// Hai logo topbar: CORSAIR trái — GUMAYUSI phải (đối xứng)
const LEFT_LOGO = "/logos/corsair.svg";
const RIGHT_LOGO = "/logos/gumalogo.svg";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // rAF-throttled scroll handler - avoids a state update per scroll event
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
        scrolled ? "shadow-[0_1px_0_rgba(236,232,26,0.1)]" : ""
      }`}
    >
      <div className="container-c flex h-16 md:h-20 items-center justify-between">
        <a href="#top" className="-ml-2 md:-ml-4 flex items-center group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LEFT_LOGO}
            alt="CORSAIR"
            className="h-10 w-auto md:h-12 transition-opacity group-hover:opacity-80"
          />
        </a>
        <a href="#top" className="-mr-2 md:-mr-4 flex items-center group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={RIGHT_LOGO}
            alt="GUMAYUSI"
            className="h-10 w-auto md:h-12 transition-opacity group-hover:opacity-80"
          />
        </a>
      </div>
    </header>
  );
}