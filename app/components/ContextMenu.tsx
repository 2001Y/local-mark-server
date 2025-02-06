import { Menu } from "@mantine/core";
import { FileNode } from "../types/file";
import { Icon } from "@iconify/react";

export interface ContextMenuProps {
  opened: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  type: "background" | "file" | "directory" | "recent";
  targetPath?: string;
  onCreateFile?: (parentPath?: string) => void;
  onCreateFolder?: (parentPath?: string) => void;
  onRename?: (node: FileNode) => void;
  onDelete?: (node: FileNode) => void;
  node?: FileNode;
}

export function ContextMenu({
  opened,
  onClose,
  position,
  type,
  targetPath,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  node,
}: ContextMenuProps) {
  if (!opened) return null;

  // メニュートリガーからの呼び出しかどうかを判定
  const isFromTrigger = position.x > window.innerWidth / 2;

  return (
    <div
      style={{
        position: "absolute",
        left: isFromTrigger ? "auto" : position.x,
        right: isFromTrigger ? window.innerWidth - position.x + 8 : "auto",
        top: position.y,
        zIndex: 999,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "4px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          border: "1px solid #eaeaea",
          minWidth: "150px",
          overflow: "hidden",
        }}
      >
        {(type === "directory" || type === "background") && (
          <>
            <div
              className="menu-item"
              onClick={() => {
                onCreateFile?.(targetPath);
                onClose();
              }}
            >
              新規ファイルを作成
            </div>
            <div
              className="menu-item"
              onClick={() => {
                onCreateFolder?.(targetPath);
                onClose();
              }}
            >
              新規フォルダを作成
            </div>
          </>
        )}
        {(type === "file" || type === "directory") && node && (
          <>
            <div
              className="menu-item"
              onClick={() => {
                onRename?.(node);
                onClose();
              }}
            >
              名前を変更
            </div>
            <div
              className="menu-item danger"
              onClick={() => {
                onDelete?.(node);
                onClose();
              }}
            >
              削除
            </div>
          </>
        )}
      </div>
      <style jsx>{`
        .menu-item {
          padding: 8px 12px;
          cursor: pointer;
          user-select: none;
          transition: background-color 0.2s;
          white-space: nowrap;
        }
        .menu-item:hover {
          background-color: #f5f5f5;
        }
        .menu-item.danger {
          color: #dc2626;
        }
        .menu-item.danger:hover {
          background-color: #fee2e2;
        }
      `}</style>
    </div>
  );
}

export function MenuTrigger({
  onClick,
}: {
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className="menu-trigger"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
    >
      <Icon icon="ph:dots-three-vertical-bold" width={16} height={16} />
      <style jsx>{`
        .menu-trigger {
          opacity: 0;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: auto;
          transition: opacity 0.2s ease;
        }
        .menu-trigger:hover {
          background-color: #e5e5e5;
        }
        :global(.tree-node:hover) .menu-trigger {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
