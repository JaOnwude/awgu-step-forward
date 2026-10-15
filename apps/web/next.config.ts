import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // In production the browser calls /api on the web app's own domain and
  // Next.js forwards it to the API (API_ORIGIN). One site means the sign-in
  // cookie is first-party. Unset locally, where the API is called directly.
  async rewrites() {
    const api = process.env.API_ORIGIN?.replace(/\/$/, "");
    return api ? [{ source: "/api/:path*", destination: `${api}/api/:path*` }] : [];
  },
};

export default nextConfig;
