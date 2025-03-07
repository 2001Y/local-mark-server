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
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

// デフォルトディレクトリの確認と作成
ensureDefaultDirectory().catch((error) => {
  console.error("Failed to ensure default directory:", error);
});

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
          href="/apple-touch-icon.png"
          type="image/png"
          sizes="512x512"
        />
        <link
          rel="apple-touch-icon"
          href="/apple-touch-icon.png"
          type="image/png"
        />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LocalMark" />
        {/* <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/service-worker.js');
                });
              }
            `,
          }}
        /> */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${styles.body}`}
      >
        <Providers initialTree={initialTree} updateTree={updateTree}>
          <div className={styles.container}>
            <SidebarWrapper>{sidebar}</SidebarWrapper>
            <main className={styles.main}>
              <ContextMenuLayout>{children}</ContextMenuLayout>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
