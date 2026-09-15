"use client";

import { PRODUCTS } from "./EventJourney";

type Props = {
  selectedSkus: string[];
  onToggle: (sku: string) => void;
};

/**
 * Chọn sản phẩm đã mua — dùng card giống product card ở THE GUMAYUSI COLLECTION.
 * Khi chọn: scale 1.05 + 4 corner-brackets trắng hiện (giống .product-card:hover).
 * Multi-select: bấm vào card nào toggle SKU đó.
 */
export default function ProductSelector({ selectedSkus, onToggle }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
      {PRODUCTS.map((p) => {
        const checked = selectedSkus.includes(p.sku);
        return (
          <label
            key={p.sku}
            className={`group product-card relative block aspect-square cursor-pointer overflow-hidden border transition-transform md:aspect-[4/3] ${
              checked ? "scale-[1.03] border-white/40" : ""
            }`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={checked}
              onChange={() => onToggle(p.sku)}
            />

            {/* Media full-bleed */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.image}
              alt={p.name}
              className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out ${
                checked ? "scale-105" : "group-hover:scale-105"
              }`}
              loading="lazy"
              decoding="async"
            />

            {/* Gradient chân card giữ chữ đọc được trên ảnh sáng */}
            <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

            {/* 4 corner brackets — luôn hiện khi checked, hover khi chưa */}
            <span
              className={`product-corner tl transition-opacity ${
                checked ? "opacity-100" : "group-hover:opacity-100"
              }`}
            />
            <span
              className={`product-corner tr transition-opacity ${
                checked ? "opacity-100" : "group-hover:opacity-100"
              }`}
            />
            <span
              className={`product-corner bl transition-opacity ${
                checked ? "opacity-100" : "group-hover:opacity-100"
              }`}
            />
            <span
              className={`product-corner br transition-opacity ${
                checked ? "opacity-100" : "group-hover:opacity-100"
              }`}
            />

            {/* Check icon góc trên-phải khi đã chọn */}
            {checked && (
              <span
                aria-hidden="true"
                className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-black shadow-md"
              >
                ✓
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
