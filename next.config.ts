import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Whop's SDK packages are server-only; keep them out of the client bundle.
  serverExternalPackages: ["@whop/sdk", "@whop/api"],
  experimental: {
    // Member video uploads go through a server action-free API route, but keep a generous body limit.
    serverActions: { bodySizeLimit: "250mb" },
  },
};

export default nextConfig;
