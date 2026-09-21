"use client";

import { useEffect, useState } from "react";
import Reveal from "./Reveal";
import Starfield from "./Starfield";
import { EVENT_END_MS, SHOPEE_BY_ID, type ShopeeLinkId } from "@/lib/config";
import { trackClick } from "@/lib/track";

type Product = {
  name: string;
  sku: string;
  tagline: string;
  image: string;
  /** id trong SHOPEE_LINKS — suy ra cả link mua lẫn khoá tracking lượt bấm */
  shopeeId: ShopeeLinkId;
};

/* GUMA Limited Edition — card đúng kiểu TwoColumnBanner của web gốc
   (assets.corsair.com refresh). Ảnh đã self-host tại public/products.
   2 mã MM 2XL dùng chung 1 link Shopee (1 link cho cả 2 lót chuột). */
const PRODUCTS: Product[] = [
  {
    name: "VANGUARD PRO 96",
    sku: "CH-91E931G-NA",
    tagline: "PROVE IT WITH OUR MOST POPULAR KEYBOARD",
    image: "/products/product-vanguardpro96-guma.webp",
    shopeeId: "shopee_keyboard",
  },
  {
    name: "SABRE v2 PRO CF",
    sku: "CH-931G20C-WW",
    tagline: "LIGHT, ACCURATE AND HOURS OF BATTERY LIFE",
    image: "/products/product-sabrev2cf-guma.webp",
    shopeeId: "shopee_mouse",
  },
  {
    name: "MM 2XL STARRY NIGHT",
    sku: "CH-941D17B-WW",
    tagline: "FEATURING GUMAYUSI",
    image: "/products/product-mmpro-starry-guma.webp",
    shopeeId: "shopee_mousepad",
  },
  {
    name: "MM 2XL BLACK/GOLD",
    sku: "CH-941D17A-WW",
    tagline: "FEATURING GUMAYUSI",
    image: "/products/product-mmpro-blk-gld-guma.webp",
    shopeeId: "shopee_mousepad",
  },
];

export { PRODUCTS };

/**
 * Đồng hồ đếm ngược đã chạy hết chưa — quyết định nút "Tìm hiểu thêm" trỏ đi
 * đâu. Phải kiểm tra ở CLIENT: trang được build tĩnh nên nếu tính lúc build
 * thì giá trị sẽ bị đóng băng mãi.
 */
function useCountdownFinished() {
  const [finished, setFinished] = useState(() => Date.now() >= EVENT_END_MS);

  useEffect(() => {
    if (finished) return;
    const id = window.setInterval(() => {
      if (Date.now() >= EVENT_END_MS) setFinished(true);
    }, 1000);
    return () => window.clearInterval(id);
  }, [finished]);

  return finished;
}

export default function EventJourney() {
  const open = useCountdownFinished();

  return (
    <section id="collection" className="section-divider cv-auto py-16 scroll-mt-20 md:py-32">
      <Starfield />
      <div className="container-c relative z-10">
        <Reveal>
          <h2 className="section-title section-title-light">
            THE GUMAYUSI COLLECTION
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {PRODUCTS.map((product, i) => {
            const link = SHOPEE_BY_ID[product.shopeeId];
            /* Hết giờ → "Tìm hiểu thêm" trỏ thẳng tới Shopee.
               Chưa hết giờ → vẫn cuộn xuống đồng hồ đếm ngược. */
            const href = open ? link.url : "#countdown";

            return (
            <Reveal key={product.name} delay={i * 90}>
              <a
                href={href}
                {...(open
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : null)}
                onClick={open ? () => trackClick(product.shopeeId) : undefined}
                aria-label={`${product.name} — ${
                  open ? "Mua trên Shopee" : "Tìm hiểu thêm"
                }`}
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
                  {/* CTA wrapper — bracket vàng staggered + URL placeholder khi hover */}
                  <div className="cta-tech mt-4">
                    <span className="cta-tech__bracket tl" />
                    <span className="cta-tech__bracket tr" />
                    <span className="cta-tech__bracket bl" />
                    <span className="cta-tech__bracket br" />
                    <span className="cta-tech__btn whitespace-nowrap bg-[#ece81a] px-8 py-1.5 text-sm font-semibold text-black transition-colors duration-200 group-hover:bg-white md:py-3">
                      {open ? "Pre-order ngay" : "Tìm hiểu thêm"}
                    </span>
                    <span className="cta-tech__url">
                      {href.replace(/^https?:\/\//, "")}
                    </span>
                  </div>
                </div>
              </a>
            </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}