/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_DEFAULT_MD_PATH: process.env.NEXT_PUBLIC_DEFAULT_MD_PATH,
  },
  trailingSlash: false,
  pageExtensions: ["ts", "tsx", "js", "jsx"],
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
};

module.exports = nextConfig;
