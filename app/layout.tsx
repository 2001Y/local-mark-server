import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@mantine/core/styles.css";
import { Providers } from "./components/Providers";
import styles from "./layout.module.css";
import { TreeProvider } from "./context/TreeContext";
import { Header } from "./components/Header";
import { DynamicEditorProvider } from "@/app/components/DynamicEditorProvider";
import { FileTreeServer } from "@/app/components/FileTreeServer";
import { ContextMenuProvider } from "./context/ContextMenuContext";
import { ContextMenuLayout } from "./components/ContextMenuLayout";

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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/service-worker.js');
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers>
          <TreeProvider initialTree={initialTree} updateTree={updateTree}>
            <DynamicEditorProvider>
              <ContextMenuProvider>
                <ContextMenuLayout>
                  <div className={styles.container}>
                    <div className={styles.sidebar}>{sidebar}</div>
                    <main className={styles.main}>
                      <Header />
                      {children}
                    </main>
                  </div>
                </ContextMenuLayout>
              </ContextMenuProvider>
            </DynamicEditorProvider>
          </TreeProvider>
        </Providers>
      </body>
    </html>
  );
}
