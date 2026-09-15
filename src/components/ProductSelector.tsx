"use client";

import { PRODUCTS } from "./EventJourney";

type Props = {
  selectedSkus: string[];
  onToggle: (sku: string) => void;
};

/**
 * Chọn sản phẩm đã mua — dùng ảnh + bracket vàng (khác product-card trắng ở
 * THE GUMAYUSI COLLECTION) để user không nhầm 2 khu vực.
 * Hover: bracket vàng mở + ảnh zoom 1.05.
 * Click: giữ bracket + zoom cố định. Click lần 2: tắt.
 */
export default function ProductSelector({ selectedSkus, onToggle }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
      {PRODUCTS.map((p) => {
        const checked = selectedSkus.includes(p.sku);
        return (
          <label
            key={p.sku}
            className={`group relative block aspect-square cursor-pointer overflow-hidden rounded-lg border border-white/10 transition-all md:aspect-[4/3] ${
              checked
                ? "scale-[1.03] border-accent shadow-[0_0_0_1px_rgba(236,232,26,0.4)]"
                : ""
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

            {/* Lớp tối nhẹ khi chưa chọn để ảnh không cháy sáng */}
            <div
              className={`absolute inset-0 bg-black/30 transition-opacity ${
                checked ? "opacity-0" : "group-hover:opacity-0"
              }`}
            />

            {/* 4 corner brackets VÀNG — phân biệt với product-card trắng.
                Hover: mở. Click: giữ cố định. */}
            <span
              className={`product-corner-accent tl ${
                checked ? "opacity-100" : "group-hover:opacity-100"
              }`}
            />
            <span
              className={`product-corner-accent tr ${
                checked ? "opacity-100" : "group-hover:opacity-100"
              }`}
            />
            <span
              className={`product-corner-accent bl ${
                checked ? "opacity-100" : "group-hover:opacity-100"
              }`}
            />
            <span
              className={`product-corner-accent br ${
                checked ? "opacity-100" : "group-hover:opacity-100"
              }`}
            />
          </label>
        );
      })}
    </div>
  );
}
