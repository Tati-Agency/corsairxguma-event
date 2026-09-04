import { EVENT } from "@/lib/config";

export default function Footer() {
  return (
    <footer className="section-divider py-12">
      <div className="container-c">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-4">
            <img
              src="/logos/corsair.svg"
              alt={EVENT.title}
              className="h-14 md:h-16"
            />
            {/* Tagline chuẩn brand book — tích hợp cùng logo, màu Bright Yellow */}
            <span
              className="hidden sm:block text-[0.65rem] tracking-[0.3em] text-accent uppercase border-l border-line pl-4"
              style={{ fontFamily: "var(--font-display)", fontVariationSettings: '"wdth" 125' }}
            >
              Worlds
              <br />
              Ahead
            </span>
          </div>
          <nav className="flex gap-6 text-sm text-muted">
            <a href="#arena" className="transition-colors hover:text-accent">
              Event Arena
            </a>
            <a href="#checkin" className="transition-colors hover:text-accent">
              Check In
            </a>
          </nav>
        </div>
        <div className="mt-8 border-t border-line pt-6 text-center text-xs text-muted">
          <p>© 2026 Event — For the world&apos;s top players.</p>
          <p className="mt-1">
            Dữ liệu check-in chỉ phục vụ sự kiện và được xử lý theo sự đồng ý
            của bạn.
          </p>
        </div>
      </div>
    </footer>
  );
}
