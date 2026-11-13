import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  async redirects() {
    return [
      {
        source: "/swdsurvey",
        destination: "https://forms.gle/uqCg51i8JVZ7ej8r7",
        permanent: false,
      },
    ];
  },
  // The club's landing page is a single static file in public/club/; serve it at /club.
  async rewrites() {
    return [{ source: "/club", destination: "/club/index.html" }];
  },
};

export default nextConfig;
