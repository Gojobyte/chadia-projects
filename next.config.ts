import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth", "html-to-docx"],
  experimental: {
    ppr: "incremental",
    optimizePackageImports: [
      "@google/generative-ai",
      "@mistralai/mistralai",
      "googleapis",
      "@mozilla/readability",
      "jsdom",
    ],
    staleTimes: {
      static: 180,
      dynamic: 30,
    },
  },
};

export default nextConfig;
