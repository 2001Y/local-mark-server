"use client";

import { useRouter, usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { useCallback, useEffect, useState } from "react";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Check if we can go back in history and if the previous page is within our service
    const checkHistory = () => {
      if (window.history.length <= 1) {
        setCanGoBack(false);
        return;
      }

      // 現在のページのオリジンを取得
      const currentOrigin = window.location.origin;

      // 一時的に履歴を戻って確認
      const currentState = window.history.state;
      window.history.go(-1);

      setTimeout(() => {
        // 戻った先のURLを確認
        const isPreviousPageInService =
          window.location.origin === currentOrigin;

        // 元のページに戻る
        window.history.go(1);

        // stateを復元
        window.history.replaceState(currentState, "", window.location.href);

        setCanGoBack(isPreviousPageInService);
      }, 0);
    };

    checkHistory();
  }, [pathname]);

  const handleBack = useCallback(() => {
    if (!canGoBack) {
      router.push("/");
      return;
    }
    router.back();
  }, [canGoBack, router]);

  if (pathname === "/") return null;

  return (
    <div className="header">
      <button onClick={handleBack} className="back-button">
        <Icon icon="ph:arrow-left" width={20} height={20} />
      </button>
      <style jsx>{`
        .header {
          position: sticky;
          top: 0;
          background: white;
          border-bottom: 1px solid #eaeaea;
          padding: 0.75rem 1rem;
          z-index: 10;
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
        }
        .back-button:hover {
          background: #f5f5f5;
          color: #333;
        }
      `}</style>
    </div>
  );
}
