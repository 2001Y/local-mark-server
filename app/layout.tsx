import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@mantine/core/styles.css";
import { Providers } from "./components/Providers";
import { SidebarWrapper } from "./components/SidebarWrapper";
import { FileTreeServer } from "./components/FileTreeServer";
import styles from "./layout.module.css";
import { ContextMenuLayout } from "./components/ContextMenuLayout";
import { ensureDefaultDirectory } from "./lib/fileSystem";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Local Mark Server",
  description: "Markdown editor for local files",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Local Mark Server",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// デフォルトディレクトリの確認と作成
ensureDefaultDirectory().catch((error) => {
  console.error("Failed to ensure default directory:", error);
});

// グローバルエラーハンドラーを追加
if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = function (...args) {
    // 元のエラーログを出力
    originalError.apply(console, args);

    // エラーオブジェクトがある場合はスタックトレースを出力
    if (args[0] instanceof Error) {
      originalError.call(console, "エラーの詳細情報:", args[0].stack);
    }
  };

  // グローバルエラーハンドラー
  window.addEventListener("error", function (event) {
    console.error("グローバルエラー発生:", event.error);
    console.error("エラーメッセージ:", event.message);
    console.error("エラー発生ファイル:", event.filename);
    console.error("エラー発生行:", event.lineno);
    console.error("エラー発生列:", event.colno);
  });

  // Promiseエラーハンドラー
  window.addEventListener("unhandledrejection", function (event) {
    console.error("未処理のPromiseエラー:", event.reason);
  });

  // ページロード完了時に実行
  window.addEventListener("load", function () {
    console.log("ページロード完了");
  });
}

interface RootLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export default async function RootLayout({
  children,
  sidebar,
}: RootLayoutProps) {
  const { initialTree, updateTree } = await FileTreeServer();

  return (
    <html lang="ja">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0066cc" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link
          rel="icon"
          href="/apple-touch-icon.jpg"
          type="image/jpeg"
          sizes="512x512"
        />
        <link
          rel="apple-touch-icon"
          href="/apple-touch-icon.jpg"
          type="image/jpeg"
        />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LocalMark" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${styles.body}`}
      >
        <Providers initialTree={initialTree} updateTree={updateTree}>
          <div className={styles.container}>
            {sidebar}
            <main className={styles.main}>
              <ContextMenuLayout>
                {children}

                {/* エラーが発生した場合のフォールバックUI */}
                <div
                  id="error-fallback"
                  style={{
                    display: "none",
                    padding: "20px",
                    backgroundColor: "#ffeeee",
                    border: "1px solid #ff0000",
                    borderRadius: "5px",
                    margin: "20px",
                    maxWidth: "800px",
                  }}
                >
                  <h2>エラーが発生しました</h2>
                  <p>アプリケーションの実行中にエラーが発生しました。</p>
                  <p id="error-message"></p>
                  <button
                    id="reload-button"
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#0066cc",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    ページを再読み込み
                  </button>
                </div>

                {/* エラーハンドリングスクリプト */}
                <script
                  dangerouslySetInnerHTML={{
                    __html: `
                      window.addEventListener('error', function(event) {
                        if (event.message && event.message.includes('Cannot read properties of undefined (reading \\'call\\')')) {
                          // エラーメッセージを表示
                          document.getElementById('error-message').textContent = event.message;
                          document.getElementById('error-fallback').style.display = 'block';
                          
                          // リロードボタンのイベントリスナーを追加
                          document.getElementById('reload-button').addEventListener('click', function() {
                            window.location.reload();
                          });
                          
                          // コンソールにエラー情報を出力
                          console.error('エラーをキャッチしました:', event.message);
                          console.error('エラー発生ファイル:', event.filename);
                          console.error('エラー発生行:', event.lineno);
                        }
                      });
                    `,
                  }}
                />
              </ContextMenuLayout>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
