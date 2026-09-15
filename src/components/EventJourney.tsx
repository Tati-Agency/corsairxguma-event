import Reveal from "./Reveal";

type Product = {
  name: string;
  sku: string;
  tagline: string;
  image: string;
  url: string;
};

/* GUMA Limited Edition — card đúng kiểu TwoColumnBanner của web gốc
   (assets.corsair.com refresh). Ảnh đã self-host tại public/products.
   Link mua VN chưa có (đang pre-order) → tạm để "#". */
const PRODUCTS: Product[] = [
  {
    name: "VANGUARD PRO 96",
    sku: "CH-91E931G-NA",
    tagline: "PROVE IT WITH OUR MOST POPULAR KEYBOARD",
    image: "/products/product-vanguardpro96-guma.png",
    url: "#",
  },
  {
    name: "SABRE v2 PRO CF",
    sku: "CH-931G20C-WW",
    tagline: "LIGHT, ACCURATE AND HOURS OF BATTERY LIFE",
    image: "/products/product-sabrev2cf-guma.png",
    url: "#",
  },
  {
    name: "MM 2XL STARRY NIGHT",
    sku: "CH-941D17B-WW",
    tagline: "FEATURING GUMAYUSI",
    image: "/products/product-mmpro-starry-guma.png",
    url: "#",
  },
  {
    name: "MM 2XL BLACK/GOLD",
    sku: "CH-941D17A-WW",
    tagline: "FEATURING GUMAYUSI",
    image: "/products/product-mmpro-blk-gld-guma.png",
    url: "#",
  },
];

export { PRODUCTS };

export default function EventJourney() {
  return (
    <section id="collection" className="section-divider cv-auto py-16 scroll-mt-20 md:py-32">
      <div className="container-c">
        <Reveal>
          <h2 className="section-title section-title-light section-title-plain">
            THE GUMAYUSI COLLECTION
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {PRODUCTS.map((product, i) => (
            <Reveal key={product.name} delay={i * 90}>
              <a
                href="#countdown"
                aria-label={`${product.name} — Tìm hiểu thêm`}
                className="product-card group relative block aspect-square overflow-hidden border md:aspect-[4/3]"
              >
                {/* Media full-bleed */}
                <img
                  src={product.image}
                  alt={product.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />

                {/* Gradient chân card giữ chữ đọc được trên ảnh sáng */}
                <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

                {/* Corner brackets trắng khi hover (như bản gốc) */}
                <span className="product-corner tl" />
                <span className="product-corner tr" />
                <span className="product-corner bl" />
                <span className="product-corner br" />

                {/* Nội dung căn giữa ở đáy card */}
                <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center justify-end px-4 pb-6 text-center md:pb-8">
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-tagline">{product.tagline}</p>
                  <span className="mt-4 inline-block whitespace-nowrap bg-[#ece81a] px-8 py-1.5 text-sm font-semibold text-black transition-colors duration-200 group-hover:bg-white md:py-3">
                    Tìm hiểu thêm
                  </span>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}