import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/Reisekosten";

const nextConfig: NextConfig = {
  basePath,
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb"
    }
  },
  // OCR-Laufzeitdateien werden zur Laufzeit per Pfad geladen und müssen in die Vercel-Functions.
  outputFileTracingIncludes: {
    "/api/receipts/analyze": [
      "./node_modules/tesseract.js/**/*",
      "./node_modules/tesseract.js-core/**/*",
      "./node_modules/@tesseract.js-data/deu/**/*"
    ],
    "/api/card-statements/analyze": [
      "./node_modules/tesseract.js/**/*",
      "./node_modules/tesseract.js-core/**/*",
      "./node_modules/@tesseract.js-data/deu/**/*"
    ]
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
