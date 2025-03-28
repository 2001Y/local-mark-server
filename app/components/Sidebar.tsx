"use client";

import Link from "next/link";
import { FileNode } from "../types/file";
import { FileTreeClient } from "./FileTreeClient";
import { SearchTrigger } from "./SearchTrigger";
import { useTree } from "@/app/context/TreeContext";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";

interface SidebarProps {
  tree: FileNode[];
  onFileSelect: (path: string | undefined) => void;
  onUpdateTree?: () => void;
}

export function Sidebar({
  tree = [],
  onFileSelect,
  onUpdateTree,
}: SidebarProps) {
  const { currentPath, isRoot } = useTree();
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 0
  );

  // 画面サイズの変更を検出
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    // 初期値を設定
    setWindowWidth(window.innerWidth);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>
          <Link href="/">LocalMark</Link>
        </h2>
      </div>
      <SearchTrigger folderPath={currentPath} className="desktop-search" />
      <button onClick={() => window.dispatchEvent(new CustomEvent("newFile"))}>
        <span>+ New</span>
      </button>
      <FileTreeClient
        tree={tree || []}
        onFileSelect={onFileSelect}
        onUpdateTree={onUpdateTree}
        className="sidebar-tree"
      />
      <style jsx>{`
        .sidebar {
          width: 300px;
          height: 100vh;
          border-right: solid 1px var(--bn-colors-hovered-background);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 100;
        }

        .sidebar-header {
          padding-bottom: 1rem;
          border-bottom: solid 1px var(--bn-colors-hovered-background);
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sidebar-header h2 {
          margin: 0;
          font-size: 1.2rem;
        }

        .new-file-button {
          font-size: 0.8rem;
          background: none;
          border: solid 1px var(--bn-colors-hovered-background);
          border-radius: 4px;
          padding: 0.3em 0.5em;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        :global(.nav-item) {
          padding: 0.75rem 1rem;
          margin-bottom: 0.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-radius: 4px;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        :global(.nav-item.active) {
          background-color: #e5f1ff;
          color: #0066cc;
        }

        .nav-icon {
          font-size: 1.1rem;
        }

        .nav-text {
          font-size: 0.95rem;
        }

        .sidebar-tree {
          border-top: solid 1px var(--bn-colors-hovered-background);
          margin-top: 1rem;
          padding-top: 1rem;
          flex: 1;
          overflow: auto;
        }

        :global(.desktop-search) {
          margin: 0 1rem;
          display: block;
        }

        @media (max-width: 768px) {
          .sidebar {
            display: none;
          }
          :global(.desktop-search) {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
