import Reveal from "./Reveal";

/**
 * ROAD TO EXCELLENCE — thành tích của Gumayusi (content mới theo web gốc).
 * THÀNH TÍCH 2026: Asian Games Final roster + MSI Champion.
 */
const ACHIEVEMENTS: { icon: string; label: string }[] = [
  {
    icon: "https://assets.corsair.com/image/upload/f_auto/q_auto/v1768268967/akamai/landing/Gumayusi/Gumayusi_about-icon_01-MVP.png",
    label: "WORLDS FINALS MVP IN 2025",
  },
  {
    icon: "https://assets.corsair.com/image/upload/f_auto/q_auto/v1768268968/akamai/landing/Gumayusi/Gumayusi_about-icon_02-WorldsChampion.png",
    label: "THREE-TIME WORLDS CHAMPION 2023-2025",
  },
  {
    icon: "https://assets.corsair.com/image/upload/f_auto/q_auto/v1768268969/akamai/landing/Gumayusi/Gumayusi_about-icon_03-AllPro.png",
    label: "2026 ASIAN GAMES FINAL LoL ROSTER",
  },
  {
    icon: "https://assets.corsair.com/image/upload/f_auto/q_auto/v1787945821/akamai/landing/Gumayusi/refresh/guma-msi.png",
    label: "2026 MSI CHAMPION",
  },
];

export default function EventArena() {
  return (
    <section id="excellence" className="section-divider scroll-mt-20 py-16 md:py-32">
      <div className="container-c">
        <Reveal>
          <h2 className="section-title section-title-light">ROAD TO EXCELLENCE</h2>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted md:text-base">
            Từ KeSPA Cup 2018 đến MVP Worlds 2025 — Gumayusi chưa bao giờ
            ngừng chứng minh bản thân, game sau game, chức vô địch sau chức
            vô địch.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {ACHIEVEMENTS.map((item, i) => (
            <Reveal key={item.label} delay={i * 90} variant="zoom">
              <div className="flex h-full flex-col items-center gap-4 rounded-xl border border-white/15 bg-[#1a1a1a] px-6 py-10 text-center">
                <img
                  src={item.icon}
                  alt=""
                  className="h-16 w-16 object-contain"
                  loading="lazy"
                  decoding="async"
                />
                <p className="display text-sm font-semibold tracking-wide text-white">
                  {item.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}