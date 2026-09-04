import Reveal from "./Reveal";

type Spec = { label: string; value: string };

const PRODUCTS: {
  name: string;
  desc: string;
  specs: Spec[];
  bestseller?: boolean;
  image: string;
  url: string;
}[] = [
  {
    name: "VANGUARD PRO 96",
    desc: "VANGUARD PRO 96 hội tụ kỹ thuật đã kiểm chứng nơi đấu trường esports cùng hàng năm trời phản hồi của người hâm mộ — hiệu năng và tính linh hoạt không thỏa hiệp.",
    specs: [
      { label: "Kết nối", value: "USB 3.0 hoặc 3.1 Type-A" },
      { label: "Dạng bàn phím", value: "96%" },
      { label: "Switch", value: "CORSAIR MGX Hyperdrive" },
      { label: "Trọng lượng", value: "1.709kg" },
    ],
    bestseller: true,
    image:
      "https://assets.corsair.com/image/upload/f_auto/q_auto/v1760586728/pages/STARLADDER-LP/VANGUARD-PRO-96.png",
    url: "https://shopee.vn/B%C3%A0n-ph%C3%ADm-c%C6%A1-Gaming-c%C3%B3-d%C3%A2y-Corsair-VANGUARD-96-MLX-RGB-(%C4%90en)-Layout-96-B%E1%BA%A3o-h%C3%A0nh-24-th%C3%A1ng-i.1662748871.50456473928?extraParams=%7B%22display_model_id%22%3A340582995784%2C%22model_selection_logic%22%3A3%7D",
  },
  {
    name: "SABRE v2 PRO WL CF",
    desc: "Thiết kế unibody sợi carbon dành cho lối chơi FPS đẳng cấp chuyên nghiệp.",
    specs: [
      { label: "Kết nối", value: "2.4GHz SLIPSTREAM, USB Type-C" },
      { label: "Cảm biến", value: "MARKSMAN S 33K Optical" },
      { label: "Tần số quét", value: "Không dây lên đến 8,000 Hz" },
      { label: "Số nút bấm", value: "5" },
    ],
    image:
      "https://assets.corsair.com/image/upload/f_auto/q_auto/v1768189459/akamai/landing/Gumayusi/SABRE_v2_PRO_WL_CF.png",
    url: "https://shopee.vn/Chu%E1%BB%99t-Gaming-Kh%C3%B4ng-D%C3%A2y-Corsair-SABRE-v2-PRO-Carbon-Fiber-CH-931G200-WW-33000DPI-B%E1%BA%A3o-h%C3%A0nh-24-th%C3%A1ng-i.1662748871.57656468306?extraParams=%7B%22display_model_id%22%3A325582163530%2C%22model_selection_logic%22%3A3%7D",
  },
  {
    name: "MM PRO Control",
    desc: "Bề mặt vải được chế tác cho khả năng kiểm soát và độ chính xác chuyên nghiệp.",
    specs: [
      { label: "Kích thước", value: "450 × 400 × 4 mm" },
      { label: "Độ dày", value: "4mm" },
      { label: "Chất liệu", value: "Vải (Cloth)" },
      { label: "Trọng lượng", value: "0.232kg" },
    ],
    bestseller: true,
    image:
      "https://assets.corsair.com/image/upload/f_auto/q_auto/v1768445796/akamai/landing/Gumayusi/MM_PRO_Control.png",
    url: "https://shopee.vn/B%C3%A0n-Di-Chu%E1%BB%99t-Corsair-MM-PRO-Control-Large-(%C4%90en-X%C3%A1m)-450x400x4mm-V%E1%BA%A3i-Cao-C%E1%BA%A5p-Ch%E1%BB%91ng-Tr%C6%B0%E1%BB%A3t-i.1662748871.45356055183?extraParams=%7B%22display_model_id%22%3A282430039387%2C%22model_selection_logic%22%3A3%7D",
  },
];

export default function EventJourney() {
  return (
    <section className="section-divider cv-auto py-16 md:py-32">
      <div className="container-c">
        <Reveal>
          <h2 className="section-title section-title-light">TRUSTED BY THE LEGEND</h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {PRODUCTS.map((product, i) => (
            <Reveal key={product.name} delay={i * 90} variant="zoom">
              <div className="relative flex h-full flex-col overflow-hidden rounded-xl bg-[#1a1a1a] md:flex-row">
                {product.bestseller && (
                  <span className="absolute left-0 top-7 z-10 bg-[#ece81a] py-1.5 pl-4 pr-6 text-[11px] font-bold uppercase tracking-wider text-black [clip-path:polygon(0_0,100%_0,calc(100%-14px)_100%,0_100%)]">
                    Bestseller
                  </span>
                )}

                <div className="flex shrink-0 items-center justify-center px-6 py-8 md:w-[42%] md:px-4 md:py-10 [background:radial-gradient(circle_at_center,#2f2f2f_0%,#1a1a1a_72%)]">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-44 w-full object-contain md:h-52"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                <div className="flex flex-1 flex-col pb-9 pr-6 md:py-11 md:pl-0 md:pr-10">
                  <h3 className="display text-2xl font-bold tracking-wide text-white">
                    {product.name}
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">
                    {product.desc}
                  </p>

                  <dl className="mt-6">
                    {product.specs.map((spec) => (
                      <div
                        key={spec.label}
                        className="grid grid-cols-[minmax(92px,150px)_1fr] items-baseline border-b border-white/15 py-2"
                      >
                        <dt className="text-[11px] font-bold uppercase tracking-wider text-white">
                          {spec.label}
                        </dt>
                        <dd className="text-xs text-white/70">{spec.value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-auto flex items-center pt-8">
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-[#ece81a] px-8 py-3 text-xs font-bold tracking-wider text-black transition-colors duration-200 hover:bg-white"
                    >
                      Tìm hiểu thêm →
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

