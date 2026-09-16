import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Cho phép truy cập dev resources (/_next/...) qua IP LAN khi test mobile thật.
   * Không có dòng này, Next 16 chặn cross-origin -> JS không hydrate -> nội dung ẩn.
   *
   * Next chỉ khớp HOSTNAME (bỏ scheme/port/path) và wildcard theo TỪNG LABEL:
   *   "*"  thay đúng 1 label, "**" thay 1+ label (chỉ đặt được ở đầu pattern).
   * Không hỗ trợ CIDR (192.168.100.0/24) và không hỗ trợ thay thế một phần
   * (vd "192.168.100.*" hợp lệ nhưng "192.168.10*.*" thì KHÔNG).
   *
   * Vì vậy dùng pattern theo các dải IP nội bộ hay gặp khi test LAN, để không
   * phải sửa file mỗi lần đổi mạng (nhà 192.168.100.x, quán cafe 172.16.x.x).
   */
  allowedDevOrigins: [
    "localhost",
    "192.168.100.*",
    "172.16.*.*",
    "10.*.*.*",
  ],
};

export default nextConfig;
