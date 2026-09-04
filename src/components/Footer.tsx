export default function Footer() {
  return (
    <footer className="section-divider py-12">
      <div className="container-c">
        <nav className="flex justify-center gap-6 text-sm text-muted">
          <a href="#arena" className="transition-colors hover:text-accent">
            Event Arena
          </a>
          <a href="#checkin" className="transition-colors hover:text-accent">
            Check In
          </a>
        </nav>
        <div className="mt-8 border-t border-line pt-6 text-center text-xs text-muted">
          <p>© 2026 Event — For the world&apos;s top players.</p>
          <p className="mt-2 tracking-wide">
            Design by <span className="font-semibold text-text">TATI</span>
            {" · "}
            Development by <span className="font-semibold text-text">pr0w4.dev</span>
          </p>
          <p className="mt-1">
            Dữ liệu check-in chỉ phục vụ sự kiện và được xử lý theo sự đồng ý
            của bạn.
          </p>
        </div>
      </div>
    </footer>
  );
}
