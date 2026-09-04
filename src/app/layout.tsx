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

export const metadata: Metadata = {
  title: "CORSAIR × GUMAYUSI — Event Check-in",
  description:
    "Check-in sự kiện CORSAIR × GUMAYUSI. Nhận Event Pass cá nhân của bạn.",
  icons: {
    icon: "/logos/corsairlogo.svg",
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
