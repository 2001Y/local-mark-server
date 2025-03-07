import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@mantine/core/styles.css";
import { Providers } from "./components/Providers";
import styles from "./layout.module.css";
import { TreeProvider } from "./context/TreeContext";
import { Header } from "./components/Header";
import { EditorProvider } from "./context/EditorContext";
import { FileTreeServer } from "@/app/components/FileTreeServer";
import { ContextMenuProvider } from "./context/ContextMenuContext";
import { ContextMenuLayout } from "./components/ContextMenuLayout";
import { ensureDefaultDirectory } from "./lib/fileSystem";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LocalMark",
  description: "Local Markdown Editor",
};

// デフォルトディレクトリの確認と作成
ensureDefaultDirectory().catch((error) => {
  console.error("Failed to ensure default directory:", error);
});

interface RootLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
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
        <Providers>
          <TreeProvider initialTree={initialTree} updateTree={updateTree}>
            <EditorProvider>
              <ContextMenuProvider>
                <ContextMenuLayout>
                  <div className={styles.container}>
                    {sidebar}
                    <main className={styles.main}>
                      <Header source="root-layout" />
                      {children}
                    </main>
                  </div>
                </ContextMenuLayout>
              </ContextMenuProvider>
            </EditorProvider>
          </TreeProvider>
        </Providers>
      </body>
    </html>
  );
}
