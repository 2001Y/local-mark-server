/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_DEFAULT_MD_PATH: process.env.NEXT_PUBLIC_DEFAULT_MD_PATH,
  },
  // experimental: {
  //   serverActions: {
  //     allowedOrigins: ["*"],
  //     bodySizeLimit: "2mb",
  //   },
  //   serverMinification: false,
  // },
  // // CSSの処理方法を明示的に指定
  // cssModules: true,
  // webpack: (config, { isServer, dev }) => {
  //   // CSSファイルの処理を確認
  //   if (!isServer) {
  //     // 出力ファイル名の設定
  //     config.output.filename = "static/chunks/[name].js";

  //     // CSSファイルの出力設定
  //     if (config.module && config.module.rules) {
  //       const cssRules = config.module.rules.find(
  //         (rule) =>
  //           rule.oneOf &&
  //           rule.oneOf.some(
  //             (oneOfRule) =>
  //               oneOfRule.test && oneOfRule.test.toString().includes("css")
  //           )
  //       );

  //       if (cssRules && cssRules.oneOf) {
  //         // CSSファイルの出力先を明示的に設定
  //         cssRules.oneOf.forEach((rule) => {
  //           if (rule.test && rule.test.toString().includes("css") && rule.use) {
  //             const miniCssExtractPlugin = rule.use.find(
  //               (loader) =>
  //                 typeof loader === "object" &&
  //                 loader.loader &&
  //                 loader.loader.includes("mini-css-extract-plugin")
  //             );

  //             if (miniCssExtractPlugin) {
  //               // CSSファイルの出力パスを設定
  //               miniCssExtractPlugin.options = {
  //                 ...miniCssExtractPlugin.options,
  //                 publicPath: "/_next/",
  //                 filename: "static/css/[name].css",
  //                 chunkFilename: "static/css/[name].css",
  //               };
  //             }
  //           }
  //         });
  //       }
  //     }

  //     // チャンクの最適化設定
  //     config.optimization = {
  //       ...config.optimization,
  //       // チャンクの分割設定
  //       splitChunks: {
  //         chunks: "all",
  //         cacheGroups: {
  //           // ベンダーチャンクの設定
  //           vendor: {
  //             name: "vendor",
  //             test: /[\\/]node_modules[\\/]/,
  //             chunks: "all",
  //             priority: 10,
  //           },
  //           // コアライブラリの設定
  //           core: {
  //             name: "core",
  //             test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
  //             chunks: "all",
  //             priority: 20,
  //           },
  //           // BlockNoteライブラリを最適化から除外
  //           blocknote: {
  //             name: "blocknote",
  //             test: /[\\/]node_modules[\\/](@blocknote)[\\/]/,
  //             chunks: "all",
  //             priority: 30,
  //             reuseExistingChunk: true,
  //           },
  //           // CSSファイルを別チャンクに分離
  //           styles: {
  //             name: "styles",
  //             test: /\.css$/,
  //             chunks: "all",
  //             enforce: true,
  //             priority: 40,
  //           },
  //         },
  //       },
  //       // チャンクの読み込み順序の最適化
  //       runtimeChunk: {
  //         name: "runtime",
  //       },
  //     };

  //     // プロダクションビルドの場合のみソースマップを有効にする
  //     if (!dev) {
  //       config.devtool = "source-map";
  //     }
  //   }
  //   return config;
  // },
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
  // async headers() {
  //   return [
  //     {
  //       source: "/:path*",
  //       headers: [
  //         {
  //           key: "X-Frame-Options",
  //           value: "DENY",
  //         },
  //         {
  //           key: "X-Content-Type-Options",
  //           value: "nosniff",
  //         },
  //         {
  //           key: "X-XSS-Protection",
  //           value: "1; mode=block",
  //         },
  //       ],
  //     },
  //     {
  //       source: "/service-worker.js",
  //       headers: [
  //         {
  //           key: "Content-Type",
  //           value: "application/javascript; charset=utf-8",
  //         },
  //       ],
  //     },
  //     // CSSファイルのMIMEタイプ設定 - すべてのパターンを網羅
  //     {
  //       source: "/_next/static/css/:path*",
  //       headers: [
  //         {
  //           key: "Content-Type",
  //           value: "text/css; charset=utf-8",
  //         },
  //         {
  //           key: "Cache-Control",
  //           value: "public, max-age=31536000, immutable",
  //         },
  //       ],
  //     },
  //     {
  //       source: "/_next/static/chunks/:path*.css",
  //       headers: [
  //         {
  //           key: "Content-Type",
  //           value: "text/css; charset=utf-8",
  //         },
  //         {
  //           key: "Cache-Control",
  //           value: "public, max-age=31536000, immutable",
  //         },
  //       ],
  //     },
  //     // ハッシュ付きCSSファイルのMIMEタイプ設定
  //     {
  //       source: "/_next/static/:path*.css",
  //       headers: [
  //         {
  //           key: "Content-Type",
  //           value: "text/css; charset=utf-8",
  //         },
  //         {
  //           key: "Cache-Control",
  //           value: "public, max-age=31536000, immutable",
  //         },
  //       ],
  //     },
  //     // 追加: クエリパラメータ付きCSSファイルのMIMEタイプ設定
  //     {
  //       source: "/_next/:path*.css",
  //       has: [
  //         {
  //           type: "query",
  //           key: "v",
  //         },
  //       ],
  //       headers: [
  //         {
  //           key: "Content-Type",
  //           value: "text/css; charset=utf-8",
  //         },
  //         {
  //           key: "Cache-Control",
  //           value: "public, max-age=31536000, immutable",
  //         },
  //       ],
  //     },
  //     {
  //       source: "/_next/static/media/:path*",
  //       headers: [
  //         {
  //           key: "Cache-Control",
  //           value: "public, max-age=31536000, immutable",
  //         },
  //       ],
  //     },
  //   ];
  // },
  // 追加: カスタムMIMEタイプの設定
  // poweredByHeader: false,
  // generateEtags: true,
};

module.exports = nextConfig;
