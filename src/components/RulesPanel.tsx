/**
 * Thể lệ chương trình Lucky Draw — nội dung lấy nguyên văn từ Google Docs của
 * ban tổ chức. Hiển thị đầy đủ (không thu gọn) theo yêu cầu.
 *
 * Panel này nằm cột trái trên desktop (cạnh fan-card + form) và nằm trên cùng
 * trên mobile.
 */

/** Tiêu đề 1 mục trong thể lệ. */
function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="display text-sm font-bold tracking-wide">{children}</h4>
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

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-muted">
          {/* 1 */}
          <div>
            <Heading>🎁 CHƯƠNG TRÌNH LUCKY DRAW</Heading>
            <p className="mt-2">
              Mua sản phẩm trong bộ sưu tập{" "}
              <strong className="text-text">CORSAIR × Gumayusi</strong> để có cơ hội
              tham gia bốc thăm trúng thưởng!
            </p>
          </div>

          {/* 2 */}
          <div className="border-t border-line pt-6">
            <Heading>🎯 CƠ CẤU GIẢI THƯỞNG</Heading>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
                    <th className="py-2 pr-3 font-semibold">Sản phẩm</th>
                    <th className="py-2 font-semibold">Giải thưởng luckydraw</th>
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
                      🎁 Móc khóa Gumayusi
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
                <strong className="text-accent">Ảnh gốc thẻ Polaroid Gumayusi</strong>
              </p>
              <p className="mt-2">Áp dụng cho khách đặt mua bàn phím hoặc chuột.</p>
              <p className="mt-1">❌ Không áp dụng cho khách chỉ mua lót chuột.</p>
            </div>
          </div>

          {/* 3 */}
          <div className="border-t border-line pt-6">
            <Heading>📸 LUCKY DRAW ĐẶC BIỆT — ẢNH GỐC POLAROID</Heading>

            <p className="mt-2 font-semibold text-text">✅ Điều kiện tham gia:</p>
            <ul className="mt-2 space-y-1.5">
              <li>
                • Pre-order trong thời gian diễn ra chương trình (từ 22/09 đến
                4/10). Điền thông tin vào trang đăng ký LUCKY DRAW (trang được mở
                và post lúc 00:01 22/09)
              </li>
              <li>
                • Mua bàn phím hoặc chuột có quyền tham gia bốc thăm ảnh gốc thẻ
                Polaroid Gumayusi, tổng cộng 3 giải.
              </li>
              <li>
                • Chỉ mua lót chuột sẽ không có quyền tham gia LUCKY DRAW ĐẶC BIỆT.
              </li>
              <li>
                • Cung cấp ảnh chụp màn hình thông tin mua hàng tại Corsair
                Official Store. Hình chụp cung cấp rõ tình trạng đơn hàng, mã đơn
                hàng.
              </li>
              <li>
                • Thời gian đăng ký tham gia LUCKY DRAW từ 22/09 đến 4/10 (Form sẽ
                đóng vào 05/10)
              </li>
              <li>
                • 📺 Livestream LUCKY DRAW ảnh gốc thẻ Polaroid dựa trên danh sách
                đăng ký tham gia sau ngày 07/10
              </li>
            </ul>
          </div>

          {/* 4 */}
          <div className="border-t border-line pt-6">
            <Heading>📝 LƯU Ý KHI THAM GIA</Heading>
            <ul className="mt-2 space-y-1.5">
              <li>
                • Vui lòng điền đúng họ tên, số điện thoại, Email và địa chỉ nhận
                hàng đầy đủ.
              </li>
              <li>
                • Cung cấp ảnh chụp màn hình thông tin mua hàng tại Corsair
                Official Store. Hình chụp cung cấp rõ tình trạng đơn hàng, mã đơn
                hàng.
              </li>
              <li>
                • Bằng chứng mua hàng phải hiển thị rõ shop, mã đơn hàng và sản
                phẩm đã đặt.
              </li>
              <li>
                • CORSAIR bảo lưu quyền sửa đổi, tạm dừng, chấm dứt và giải thích
                chương trình này.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
