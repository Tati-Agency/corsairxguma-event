import type { Metadata } from "next";
import { Saira_Condensed, Saira } from "next/font/google";
import "./globals.css";

const display = Saira_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
  display: "swap",
});

const body = Saira({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
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
    <html lang="vi" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
