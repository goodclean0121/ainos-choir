import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

// Korean glyphs come in many unicode-range slices, so nothing is preloaded.
// Only the two weights the design uses: 300 for text, 400 for emphasis.
const noto = Noto_Sans_KR({ weight: ["300", "400"], variable: "--font-noto", preload: false, display: "swap" });

export const metadata: Metadata = {
  title: "파트노트",
  description: "아이노스 합창단 파트 연습",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f4f1ea" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={noto.variable}>
      <body>{children}</body>
    </html>
  );
}
