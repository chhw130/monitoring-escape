import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "키이스케이프 예약 모니터",
  description: "홍대점 투투 어드벤처 · AYAKO · 괴록 실시간 예약 현황",
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
