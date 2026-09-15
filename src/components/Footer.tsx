import Starfield from "./Starfield";

export default function Footer() {
  return (
    <footer className="section-divider py-12">
      <Starfield density="medium" />
      <div className="container-c relative z-10">
        <div className="border-t border-line pt-6 text-center text-xs text-muted">
          <p>© 2026 CORSAIR × GUMAYUSI — For the world&apos;s top players.</p>
          <p className="mt-2 tracking-wide">
            Design by <span className="font-semibold text-text">TATI</span>
            {" · "}
            Development by <span className="font-semibold text-text">pr0w4.dev</span>
          </p>
          <p className="mt-1">
            Hóa đơn và thông tin chỉ phục vụ việc xác minh đăng ký tham gia
            chương trình.
          </p>
        </div>
      </div>
    </footer>
  );
}