import Reveal from "./Reveal";

const PRODUCTS = [
  {
    name: "VANGUARD PRO 96",
    category: "KEYBOARD",
    desc: "Bàn phím Hall Effect với switch MGX Hyperdrive, polling rate 8K — tốc độ và độ chính xác tuyệt đối cho esports.",
    spec: "96% • MGX Hyperdrive • 8000Hz",
    image: "https://assets.corsair.com/image/upload/f_auto/q_auto/v1760586728/pages/STARLADDER-LP/VANGUARD-PRO-96.png",
    url: "https://shopee.vn/B%C3%A0n-ph%C3%ADm-c%C6%A1-Gaming-c%C3%B3-d%C3%A2y-Corsair-VANGUARD-96-MLX-RGB-(%C4%90en)-Layout-96-B%E1%BA%A3o-h%C3%A0nh-24-th%C3%A1ng-i.1662748871.50456473928?extraParams=%7B%22display_model_id%22%3A340582995784%2C%22model_selection_logic%22%3A3%7D",
  },
  {
    name: "SABRE v2 PRO WL CF",
    category: "MOUSE",
    desc: "Chuột không dây carbon fiber nguyên khối, cảm biến MARKSMAN S 33K — thiết kế dành riêng cho FPS chuyên nghiệp.",
    spec: "33K DPI • 8000Hz Wireless • Carbon Fiber",
    image: "https://assets.corsair.com/image/upload/f_auto/q_auto/v1768189459/akamai/landing/Gumayusi/SABRE_v2_PRO_WL_CF.png",
    url: "https://shopee.vn/Chu%E1%BB%99t-Gaming-Kh%C3%B4ng-D%C3%A2y-Corsair-SABRE-v2-PRO-Carbon-Fiber-CH-931G200-WW-33000DPI-B%E1%BA%A3o-h%C3%A0nh-24-th%C3%A1ng-i.1662748871.57656468306?extraParams=%7B%22display_model_id%22%3A325582163530%2C%22model_selection_logic%22%3A3%7D",
  },
  {
    name: "MM PRO Control",
    category: "MOUSEPAD",
    desc: "Lót chuột bề mặt cloth chuyên esports, kiểm soát hoàn hảo từng chuyển động — công cụ không thể thiếu của pro player.",
    spec: "450 × 400mm • 4mm • Cloth",
    image: "https://assets.corsair.com/image/upload/f_auto/q_auto/v1768445796/akamai/landing/Gumayusi/MM_PRO_Control.png",
    url: "https://shopee.vn/B%C3%A0n-Di-Chu%E1%BB%99t-Corsair-MM-PRO-Control-Large-(%C4%90en-X%C3%A1m)-450x400x4mm-V%E1%BA%A3i-Cao-C%E1%BA%A5p-Ch%E1%BB%91ng-Tr%C6%B0%E1%BB%A3t-i.1662748871.45356055183?extraParams=%7B%22display_model_id%22%3A282430039387%2C%22model_selection_logic%22%3A3%7D",
  },
];

export default function EventJourney() {
  return (
    <section className="section-divider cv-auto py-20 md:py-32">
      <div className="container-c">
        <Reveal>
          <h2 className="section-title">TRUSTED BY THE LEGEND</h2>
        </Reveal>

        <div className="mt-14 flex flex-wrap justify-center gap-5">
          {PRODUCTS.map((product, i) => (
            <Reveal key={product.name} delay={i * 90} variant="zoom" className="w-full sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.834rem)]">
              <div className="card group flex h-full flex-col">
                <div className="flex items-center justify-center bg-surface-2 p-8 sm:p-10">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-48 w-full object-contain transition-transform duration-500 group-hover:scale-105 sm:h-56"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="card-core flex flex-1 flex-col">
                  <span className="eyebrow text-xs">{product.category}</span>
                  <h3 className="display mt-3 text-lg font-bold tracking-wide sm:text-xl">
                    {product.name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {product.desc}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                      {product.spec}
                    </span>
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-accent !px-4 !py-2 text-xs"
                    >
                      SHOP NOW
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
