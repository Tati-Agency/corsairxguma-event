import { EVENT } from "@/lib/config";
import Reveal from "./Reveal";

export default function EventIntro() {
  return (
    <section className="section-divider py-16 md:py-32">
      <div className="container-c grid gap-12 md:grid-cols-2 md:items-center">
        <Reveal variant="left" className="w-full">
          <h2 className="section-title text-center leading-[1.05] md:text-left md:leading-none">
            ONE DAY.
            <br />
            ONE PLAYER.
            <br />
            <span className="text-accent">YOUR MOMENT.</span>
          </h2>
        </Reveal>

        <Reveal delay={150} variant="right" className="w-full">
          <div className="space-y-5 text-center leading-[1.7] text-muted md:text-left md:leading-relaxed">
            <p>
              Chào mừng đến với {EVENT.title} — sự kiện dành riêng cho cộng đồng
              fan. Đây là dịp để bạn tận mắt trải nghiệm những bộ gear đỉnh cao,
              gặp gỡ những người cùng đam mê và ghi dấu khoảnh khắc riêng của mình.
            </p>
            <p>
              Quét QR, điền thông tin và nhận <strong className="text-text">Event Pass</strong>{" "}
              cá nhân — tấm vé thông minh theo bạn suốt sự kiện.
            </p>
            <div className="card text-center md:text-left">
              <div className="card-core !p-6">
                <p className="font-semibold text-text">{EVENT.date}</p>
                <p className="font-semibold text-text">{EVENT.time}</p>
                <p className="font-semibold text-text">{EVENT.venue}</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
