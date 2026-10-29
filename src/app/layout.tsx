import type { Metadata, Viewport } from "next";
import { Gothic_A1, Gowun_Dodum } from "next/font/google";
import "./globals.css";

// Korean glyphs come in many unicode-range slices, so nothing is preloaded.
const body = Gothic_A1({ weight: ["400", "600", "800"], variable: "--font-body", preload: false, display: "swap" });
const display = Gowun_Dodum({ weight: "400", variable: "--font-display", preload: false, display: "swap" });

export const metadata: Metadata = {
  title: "아이노스 찬양연습",
  description: "아이노스 합창단 파트 연습",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#eaf2f7" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${body.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
