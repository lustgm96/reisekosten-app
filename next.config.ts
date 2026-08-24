import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/Reisekosten";

const nextConfig: NextConfig = {
  basePath,
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb"
    }
  },
  serverExternalPackages: [
    "@napi-rs/canvas",
    "@tesseract.js-data/deu",
    "pdfjs-dist",
    "tesseract.js",
    "tesseract.js-core"
  ],
  trailingSlash: true
};

export default nextConfig;
