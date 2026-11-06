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
};

export default nextConfig;
