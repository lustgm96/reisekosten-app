import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/Reisekosten";

const nextConfig: NextConfig = {
  basePath,
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist"],
  trailingSlash: true
};

export default nextConfig;
