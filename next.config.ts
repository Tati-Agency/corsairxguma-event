import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cho phép truy cập dev resources (/_next/...) qua IP LAN khi test mobile thật.
  // Không có dòng này, Next 16 chặn cross-origin -> JS không hydrate -> nội dung ẩn.
  allowedDevOrigins: ["192.168.100.175", "192.168.100.96", "localhost"],
};

export default nextConfig;
