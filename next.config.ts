import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel 서버리스 함수 최대 실행 시간 (초) - Pro: 최대 300, 무료: 최대 60
  serverExternalPackages: [],
};

export default nextConfig;
