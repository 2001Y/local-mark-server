"use client";

import React, { useRef, useEffect } from "react";
import { useContextMenu } from "../context/ContextMenuContext";
import { Icon } from "@iconify/react";

interface ContextMenuLayoutProps {
  children: React.ReactNode;
  onCreateFile?: (parentPath?: string) => void;
  onCreateFolder?: (parentPath?: string) => void;
  onRename?: (path: string) => void;
  onDelete?: (path: string) => void;
}

export function ContextMenuLayout({
  children,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
}: ContextMenuLayoutProps) {
  const { menuState, closeMenu } = useContextMenu();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (menuState.opened && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 8;

      let { x, y } = menuState.position;

      // 横方向の調整
      if (viewportWidth - x < rect.width + padding) {
        x = x - rect.width;
      }

      // 縦方向の調整
      if (viewportHeight - y < rect.height + padding) {
        y = y - rect.height;
      }

      // 画面外にはみ出さないように制限
      x = Math.max(padding, Math.min(x, viewportWidth - rect.width - padding));
      y = Math.max(
        padding,
        Math.min(y, viewportHeight - rect.height - padding)
      );

      menuRef.current.style.left = `${x}px`;
      menuRef.current.style.top = `${y}px`;
    }
  }, [menuState.opened, menuState.position]);

  return (
    <div className="context-menu-layout">
      {children}
      {menuState.opened && (
        <div ref={menuRef} className="context-menu">
          <div className="menu-content">
            {menuState.type === "directory" && (
              <>
                <button
                  role="menuitem"
                  onClick={() => {
                    if (menuState.path) {
                      onCreateFile?.(menuState.path);
                    }
                    closeMenu();
                  }}
                >
                  <Icon icon="ph:file-plus" />
                  新規ファイルを作成
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    if (menuState.path) {
                      onCreateFolder?.(menuState.path);
                    }
                    closeMenu();
                  }}
                >
                  <Icon icon="ph:folder-plus" />
                  新規フォルダを作成
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    if (menuState.path) {
                      onRename?.(menuState.path);
                    }
                    closeMenu();
                  }}
                >
                  <Icon icon="ph:pencil-simple" />
                  名前を変更
                </button>
                <button
                  role="menuitem"
                  className="danger"
                  onClick={() => {
                    if (menuState.path) {
                      onDelete?.(menuState.path);
                    }
                    closeMenu();
                  }}
                >
                  <Icon icon="ph:trash" />
                  削除
                </button>
              </>
            )}
            {menuState.type === "file" && (
              <>
                <button
                  role="menuitem"
                  onClick={() => {
                    if (menuState.path) {
                      onRename?.(menuState.path);
                    }
                    closeMenu();
                  }}
                >
                  <Icon icon="ph:pencil-simple" />
                  名前を変更
                </button>
                <button
                  role="menuitem"
                  className="danger"
                  onClick={() => {
                    if (menuState.path) {
                      onDelete?.(menuState.path);
                    }
                    closeMenu();
                  }}
                >
                  <Icon icon="ph:trash" />
                  削除
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .context-menu-layout {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .context-menu {
          position: fixed;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          border: solid 1px var(--bn-colors-hovered-background);
          min-width: 150px;
          overflow: hidden;
          animation: menuFadeIn 0.1s ease;
          transform-origin: top left;
          z-index: 1000;
        }

        @keyframes menuFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .menu-content {
          display: flex;
          flex-direction: column;
        }

        button {
          padding: 8px 12px;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          transition: background-color 0.2s;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        button.danger {
          color: #dc2626;
        }
      `}</style>
    </div>
  );
}
