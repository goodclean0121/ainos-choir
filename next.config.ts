import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Admins save whole MusicXML scores through server actions; big choral scores can pass 1 MB.
  experimental: { serverActions: { bodySizeLimit: "10mb" }, proxyClientMaxBodySize: "10mb" },
};

export default nextConfig;
