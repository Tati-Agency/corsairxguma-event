import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Brand book: SAIRA (Omnibus-Type) — self-host từ /fonts, không phụ thuộc Google Fonts CDN.
// Variable font với 2 trục: wght 100-900 và wdth 50-125.
// Expanded (125%) cho headline, Normal (100%) cho body — map qua font-stretch trong CSS.
const saira = localFont({
  src: "../../public/fonts/Saira/Saira-VariableFont_wdth,wght.ttf",
  weight: "100 900",
  variable: "--font-saira",
  display: "swap",
});

/** Domain production — dùng làm gốc cho URL tuyệt đối trong thẻ Open Graph. */
const SITE_URL = "https://corsairgumayusilimitededition.com";
const OG_TITLE = "CORSAIR × GUMAYUSI — Đăng ký tham gia";
const OG_DESCRIPTION =
  "Đăng ký tham gia chương trình CORSAIR × GUMAYUSI dành riêng cho chủ nhân GUMAYUSI Collection. Xác minh hóa đơn mua hàng và nhận mã tham gia của bạn.";
/** Ảnh thumbnail khi share link — 1200×628 (tỉ lệ 1.91:1, chuẩn Open Graph). */
const OG_IMAGE = {
  url: "/img-bg-landscape.png",
  width: 1200,
  height: 628,
  alt: "CORSAIR × GUMAYUSI — GUMAYUSI Collection",
};

export const metadata: Metadata = {
  // metadataBase: Next dùng làm gốc để dựng URL tuyệt đối cho og:image,
  // canonical… (Facebook/Zalo yêu cầu URL tuyệt đối, không nhận đường dẫn tương đối).
  metadataBase: new URL(SITE_URL),
  title: OG_TITLE,
  description: OG_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/logos/corsairlogo.svg",
  },
  // Facebook / Messenger / Zalo / Discord / LinkedIn đọc nhóm thẻ này.
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "CORSAIR × GUMAYUSI",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    locale: "vi_VN",
    images: [OG_IMAGE],
  },
  // X (Twitter) đọc riêng nhóm twitter:*; summary_large_image = thẻ ảnh lớn.
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      className={saira.variable}
      // Inline script trong body thêm class "js" trước hydration — suppress
      // để React không cảnh báo/gỡ class này khi đối chiếu server/client.
      suppressHydrationWarning
    >
      <body>
        {/* Đánh dấu "js" trước khi render bất kỳ nội dung nào — CSS dựa vào flag
            này để ẩn .reveal. Nếu JS không chạy (bị chặn/lỗi chunk), flag không
            bao giờ xuất hiện -> .reveal vẫn hiện bình thường (fallback no-JS). */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
        {children}
      </body>
    </html>
  );
}
