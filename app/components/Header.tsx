"use client";

import { useRouter, usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { useCallback, useEffect, useState } from "react";
import { Breadcrumb } from "./Breadcrumb";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [canGoBack, setCanGoBack] = useState(false);
  const isRoot = pathname === "/" || pathname === "/content";

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, [pathname]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
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
              z-index: 100;
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
