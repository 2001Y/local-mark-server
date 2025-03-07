"use client";

import { useRouter, usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { useCallback, useEffect, useState, useRef } from "react";
import { Breadcrumb } from "./Breadcrumb";
import path from "path";
import { generateUrl, normalizePath } from "../lib/pathUtils";

interface HeaderProps {
  source?: string;
}

export function Header({ source = "unknown" }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [canGoBack, setCanGoBack] = useState(false);
  const isRoot = pathname === "/" || pathname === "/content";
  // 前のページのURLを保存するためのref
  const previousUrlRef = useRef<string | null>(null);

  // デバッグ用ログ
  useEffect(() => {
    console.log(`[Header-${source}] pathname:`, pathname);
    console.log(`[Header-${source}] isRoot:`, isRoot);
  }, [pathname, isRoot, source]);

  // 履歴の状態を確認し、前のページのURLを保存
  useEffect(() => {
    // 履歴APIが利用可能かチェック
    if (
      typeof window !== "undefined" &&
      window.history &&
      window.history.state
    ) {
      setCanGoBack(window.history.length > 1);

      // 現在のURLを保存
      const currentUrl = window.location.href;
      console.log(`[Header] 現在のURL:`, currentUrl);

      // popstateイベントをリッスンして前のページのURLを取得
      const handlePopState = (event: PopStateEvent) => {
        previousUrlRef.current = currentUrl;
        console.log(`[Header] 前のページのURL:`, previousUrlRef.current);
      };

      window.addEventListener("popstate", handlePopState);

      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, [pathname]);

  const handleBack = useCallback(() => {
    // 履歴がある場合
    if (window.history.length > 1) {
      try {
        // 一時的にpopstateイベントをキャプチャして、遷移先のURLを確認
        let willNavigateToExternalSite = false;

        // 現在のホスト名を取得
        const currentHost = window.location.hostname;
        console.log(`[Header] 現在のホスト:`, currentHost);

        // 履歴の1つ前の状態を確認（可能な場合）
        if (window.history.state && window.history.state.as) {
          const previousPath = window.history.state.as;
          console.log(`[Header] 前のパス:`, previousPath);

          // 相対パスの場合は同じサイト内
          if (previousPath.startsWith("/")) {
            willNavigateToExternalSite = false;
          } else {
            // URLオブジェクトを作成して比較
            try {
              const previousUrl = new URL(previousPath);
              willNavigateToExternalSite = previousUrl.hostname !== currentHost;
              console.log(
                `[Header] 外部サイトへの遷移:`,
                willNavigateToExternalSite
              );
            } catch (e) {
              // URLの解析に失敗した場合は安全のためトップページに遷移
              willNavigateToExternalSite = true;
            }
          }
        }

        if (willNavigateToExternalSite) {
          // 外部サイトへの遷移の場合はトップページに遷移
          console.log(
            `[Header] 外部サイトへの遷移を検出、トップページに遷移します`
          );
          router.push("/");
        } else {
          // 同じサイト内の遷移の場合は通常の戻る操作
          console.log(`[Header] 同じサイト内の遷移、通常の戻る操作を実行`);
          router.back();
        }
      } catch (error) {
        // エラーが発生した場合は安全のためトップページに遷移
        console.error(`[Header] 戻る操作でエラー:`, error);
        router.push("/");
      }
    } else {
      // 履歴がない場合はトップページに遷移
      console.log(`[Header] 履歴がないため、トップページに遷移します`);
      router.push("/");
    }
  }, [router]);

  return (
    <>
      {!isRoot && (
        <div className="header">
          <div className="header-content">
            <button onClick={handleBack} className="back-button">
              <Icon icon="ph:arrow-left" width={20} height={20} />
            </button>
            <Breadcrumb currentPath={pathname} showOnHover />
          </div>
          <style jsx>{`
            .header {
              position: sticky;
              top: 0;
              left: 0;
              right: 0;
              background: white;
              border-bottom: 1px solid #eaeaea;
              padding: 0.75rem 1rem;
              z-index: 200;
              width: 100%;
            }

            .header-content {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 0.2rem;
              max-width: 100%;
            }

            .back-button {
              display: flex;
              align-items: center;
              justify-content: center;
              background: none;
              border: none;
              padding: 0.5rem;
              border-radius: 4px;
              cursor: pointer;
              color: #666;
              transition: all 0.2s;
              flex-shrink: 0;
            }

            .back-button:hover {
              background: #f5f5f5;
              color: #333;
            }
          `}</style>
        </div>
      )}
    </>
  );
}
