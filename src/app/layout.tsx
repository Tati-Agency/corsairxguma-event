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
    <html lang="vi" className={saira.variable}>
      <body>{children}</body>
    </html>
  );
}
