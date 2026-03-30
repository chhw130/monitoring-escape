import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "방탈 모니터링",
  description: "방탈출 카페 실시간 예약 현황 모니터링",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
