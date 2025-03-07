/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_DEFAULT_MD_PATH: process.env.NEXT_PUBLIC_DEFAULT_MD_PATH,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
      bodySizeLimit: "2mb",
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.output.filename = "static/chunks/[name].js";
    }
    return config;
  },
  trailingSlash: false,
  pageExtensions: ["ts", "tsx", "js", "jsx"],
  // Disable static optimization for API routes
  rewrites: async () => {
    return [
      {
        source: "/api/:path*",
        destination: "/api/:path*",
      },
      {
        source: "/edit/:path*",
        destination: "/edit/:path*",
      },
    ];
  },
  // Add security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
      {
        source: "/service-worker.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
