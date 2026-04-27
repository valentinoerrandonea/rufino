import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone output produces .next/standalone/server.js that Electron embeds.
  output: "standalone",
};

export default nextConfig;
