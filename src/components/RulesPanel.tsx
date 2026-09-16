"use client";

import { useState } from "react";

/**
 * Thể lệ chương trình Lucky Draw — nội dung lấy nguyên văn từ Google Docs
 * của ban tổ chức. Hiển thị dạng accordion để không chiếm quá nhiều chỗ khi
 * panel nằm cạnh form (desktop) và đỡ phải cuộn dài (mobile).
 */

/** Một mục accordion: tiêu đề + nội dung, mở/đóng độc lập nhau. */
function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-line first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 py-4 text-left transition-colors hover:text-accent"
      >
        <span className="display text-sm font-bold tracking-wide">{title}</span>
        <span
          aria-hidden="true"
          className={`mt-0.5 shrink-0 text-accent transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {/* Kỹ thuật grid-template-rows 0fr→1fr để animate chiều cao mà không
          cần biết trước nội dung dài bao nhiêu */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="pb-5 text-sm leading-relaxed text-muted">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function RulesPanel() {
  return (
    <div className="card h-full">
      <div className="card-core !p-6 md:!p-8">
        <p className="eyebrow text-accent">Thể lệ</p>
        <h3 className="display mt-3 text-xl font-bold tracking-wide md:text-2xl">
          THỂ LỆ THAM GIA
        </h3>

        <div className="mt-4">
          {/* 1 */}
          <Section title="🎁 CHƯƠNG TRÌNH LUCKY DRAW" defaultOpen>
            <p>
              Mua sản phẩm trong bộ sưu tập{" "}
              <strong className="text-text">CORSAIR × Gumayusi</strong> để có cơ hội
              tham gia bốc thăm trúng thưởng!
            </p>
          </Section>

          {/* 2 */}
          <Section title="🎯 CƠ CẤU GIẢI THƯỞNG">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
                    <th className="py-2 pr-3 font-semibold">Sản phẩm</th>
                    <th className="py-2 font-semibold">Giải thưởng</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-line/50">
                    <td className="py-2 pr-3 align-top">
                      ⌨️ VANGUARD PRO 96 GUMAYUSI Edition
                    </td>
                    <td className="py-2 align-top text-text">
                      🎁 Standee acrylic Gumayusi
                    </td>
                  </tr>
                  <tr className="border-b border-line/50">
                    <td className="py-2 pr-3 align-top">
                      🖱️ SABRE v2 PRO Wireless CF GUMAYUSI Edition
                    </td>
                    <td className="py-2 align-top text-text">
                      🎁 Dây đeo (ribbon) Gumayusi
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 align-top">✨ MM 2XL GUMAYUSI Edition</td>
                    <td className="py-2 align-top text-text">
                      🎁 Khăn lau kính Gumayusi
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 border border-accent/30 bg-accent/5 p-3">
              <p className="text-text">
                🎴{" "}
                <strong className="text-accent">
                  Ảnh gốc (photo master) thẻ Polaroid Gumayusi
                </strong>
              </p>
              <p className="mt-2">Áp dụng cho khách đặt mua bàn phím hoặc chuột.</p>
              <p className="mt-1">❌ Không áp dụng cho khách chỉ mua lót chuột.</p>
            </div>
          </Section>

          {/* 3 */}
          <Section title="📸 LUCKY DRAW ĐẶC BIỆT — ẢNH GỐC POLAROID">
            <p>
              Mua bàn phím hoặc chuột trong bộ sưu tập để có cơ hội tham gia bốc
              thăm:
            </p>
            <ul className="mt-3 space-y-1.5">
              <li>
                🎁 <strong className="text-text">Giải thưởng:</strong> Ảnh gốc (photo
                master) thẻ Polaroid Gumayusi – tổng cộng 3 tấm.
              </li>
              <li>
                👤 <strong className="text-text">Số người trúng:</strong> 3 người – mỗi
                người nhận 1 tấm.
              </li>
            </ul>

            <p className="mt-4 font-semibold text-text">✅ Điều kiện tham gia:</p>
            <ul className="mt-2 space-y-1.5">
              <li>
                • Hoàn tất đặt trước tại Shopee “Gian hàng chính hãng CORSAIR”.
                (link mở ở đồng hồ đếm ngược vào 0h 22/09)
              </li>
              <li>
                • Sản phẩm đủ điều kiện: Bàn phím VANGUARD PRO 96 GUMAYUSI Edition
                hoặc Chuột SABRE v2 PRO Wireless CF GUMAYUSI Edition.
              </li>
              <li>
                ❌ Chỉ mua lót chuột MM 2XL GUMAYUSI Edition sẽ không đủ điều kiện
                tham gia.
              </li>
            </ul>

            <p className="mt-4">
              Livestream công bố sau ngày 22/09 trên fanpage Facebook của CORSAIR
              (VN).
            </p>
          </Section>

          {/* 4 */}
          <Section title="📝 LƯU Ý KHI THAM GIA">
            <ul className="space-y-1.5">
              <li>
                • Vui lòng điền đúng họ tên, số điện thoại, Email và địa chỉ nhận
                hàng đầy đủ.
              </li>
              <li>
                • Bằng chứng mua hàng phải hiển thị rõ mã đơn hàng, sản phẩm đã mua
                và số hóa đơn.
              </li>
              <li>• Việc liên hệ trúng thưởng và gửi quà sẽ ưu tiên qua Email.</li>
              <li>
                • CORSAIR bảo lưu quyền sửa đổi, tạm dừng, chấm dứt và giải thích
                chương trình này.
              </li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
