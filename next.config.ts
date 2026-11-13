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
      // The landing page used to live here; it is now the home page.
      { source: "/club", destination: "/", permanent: false },
    ];
  },
  // The club's landing page is a single static file in public/club/, served as the home page.
  // The ballot lives at /vote (src/app/vote/page.tsx).
  async rewrites() {
    return [{ source: "/", destination: "/club/index.html" }];
  },
};

export default nextConfig;
