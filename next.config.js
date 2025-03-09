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
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // 出力ファイル名の設定
      config.output.filename = "static/chunks/[name].js";

      // チャンクの最適化設定
      config.optimization = {
        ...config.optimization,
        // チャンクの分割設定
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            // ベンダーチャンクの設定
            vendor: {
              name: "vendor",
              test: /[\\/]node_modules[\\/]/,
              chunks: "all",
              priority: 10,
            },
            // コアライブラリの設定（Function.prototype.callを使用する可能性のあるもの）
            core: {
              name: "core",
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              chunks: "all",
              priority: 20,
            },
          },
        },
        // チャンクの読み込み順序の最適化
        runtimeChunk: {
          name: "runtime",
        },
      };

      // プロダクションビルドの場合のみソースマップを有効にする
      if (!dev) {
        config.devtool = "source-map";
      }
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
