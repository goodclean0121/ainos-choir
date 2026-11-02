import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Admins save whole MusicXML scores through server actions; big choral scores can pass 1 MB.
  experimental: { serverActions: { bodySizeLimit: "10mb" }, proxyClientMaxBodySize: "10mb" },
  // The trial (sample data, new design) is a single HTML file; /trial opens it and it can be added to a home screen.
  async rewrites() {
    return [{ source: "/trial", destination: "/trial/index.html" }];
  },
};

export default nextConfig;
