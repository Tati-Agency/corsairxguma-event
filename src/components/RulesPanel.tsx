/**
 * Thể lệ chương trình — hiển thị cạnh form đăng ký.
 * Desktop: cột trái. Mobile: trên form.
 * Nội dung hiện là placeholder — bạn sửa thẳng trong file này.
 */
export default function RulesPanel() {
  return (
    <div className="card h-full">
      <div className="card-core !p-6 md:!p-8">
        <p className="eyebrow text-accent">Thể lệ</p>
        <h3 className="display mt-3 text-xl font-bold tracking-wide md:text-2xl">
          THỂ LỆ CHƯƠNG TRÌNH
        </h3>

        <ol className="mt-6 space-y-4 text-sm leading-relaxed text-muted md:text-base">
          <li className="flex gap-3">
            <span className="text-accent font-bold">01.</span>
            <span>
              Chương trình dành cho khách hàng đã mua ít nhất 1 sản phẩm
              <strong className="text-text"> GUMAYUSI Collection</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent font-bold">02.</span>
            <span>
              Mỗi số điện thoại chỉ được đăng ký <strong className="text-text">1 lần</strong>{" "}
              cho mỗi sự kiện.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent font-bold">03.</span>
            <span>
              Hình thức tham gia: chọn sản phẩm đã mua, điền thông tin cá nhân và tải
              lên ảnh hóa đơn mua hàng (tối đa 3 ảnh).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent font-bold">04.</span>
            <span>
              Thời gian mở cổng đăng ký: <strong className="text-text">22/09/2026</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-accent font-bold">05.</span>
            <span>
              Kết quả lucky-draw sẽ được thông báo qua email đã đăng ký.
            </span>
          </li>
        </ol>

        <p className="mt-6 text-xs text-muted">
          * Bằng việc đăng ký, bạn đồng ý với điều khoản và điều kiện của chương
          trình.
        </p>
      </div>
    </div>
  );
}
