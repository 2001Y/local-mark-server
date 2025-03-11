"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FileNode } from "../types/file";
import path from "path";
import { MenuTrigger } from "./MenuTrigger";
import { useTree } from "@/app/context/TreeContext";
import {
  normalizePath,
  generateTreeState,
  generateUrl,
} from "../lib/pathUtils";
import { useContextMenu } from "../context/ContextMenuContext";
import { useDebugError } from "../hooks/useDebugError";

interface FileTreeClientProps {
  tree: FileNode[];
  onFileSelect: (path: string | undefined) => void;
  onUpdateTree?: () => void;
  className?: string;
}

interface TreeNodeProps {
  node: FileNode;
  level?: number;
  onFileSelect: (path: string | undefined) => void;
  onUpdateTree?: () => void;
}

function TreeNode({ node, level = 0, onFileSelect }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { currentPath } = useTree();
  const isActive = currentPath === node.path;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (node.type === "directory") {
        setIsOpen(!isOpen);
      } else {
        onFileSelect(node.path);
      }
    },
    [node, isOpen, onFileSelect]
  );

  useEffect(() => {
    // パスが一致する場合は自動的に開く
    if (currentPath?.startsWith(node.path || "")) {
      setIsOpen(true);
    }
  }, [currentPath, node.path]);

  return (
    <div className={`tree-node ${isActive ? "active" : ""}`}>
      <div
        className={`node-content ${node.type}`}
        onClick={handleClick}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        <span className="node-icon">
          {node.type === "directory" ? "📁" : "📄"}
        </span>
        <span className="node-name">{node.name}</span>
        {node.path && <MenuTrigger path={node.path} />}
      </div>

      {node.type === "directory" &&
        isOpen &&
        node.children &&
        node.children.length > 0 && (
          <div className="node-children">
            {node.children.map((child) => (
              <TreeNode
                key={child.path ?? child.name}
                node={child}
                level={level + 1}
                onFileSelect={onFileSelect}
              />
            ))}
          </div>
        )}

      <style jsx>{`
        .tree-node {
          font-size: 0.9rem;
        }
        .node-content {
          display: flex;
          align-items: center;
          padding: 6px 8px;
          cursor: pointer;
          border-radius: 4px;
          margin: 2px 0;
          position: relative;
        }
        .node-content.active {
          background-color: #e5f1ff;
          color: #0066cc;
        }
        .node-icon {
          margin-right: 6px;
          font-size: 1rem;
        }
        .node-name {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .node-children {
          margin-left: 0;
        }
        .directory {
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

export function FileTreeClient({
  tree = [],
  onFileSelect,
  onUpdateTree,
  className,
}: FileTreeClientProps) {
  // デバッグ用のエラー検出（条件を厳密に確認）
  useDebugError(
    "FileTreeClient: tree is undefined or not an array",
    tree === undefined || (tree !== null && !Array.isArray(tree)),
    { tree, type: typeof tree }
  );

  // treeが配列でない場合は空配列として扱う
  const safeTree = Array.isArray(tree) ? tree : [];

  return (
    <div className={className}>
      {safeTree.length > 0 ? (
        safeTree.map((node) => (
          <TreeNode
            key={node.path ?? node.name}
            node={node}
            onFileSelect={onFileSelect}
            onUpdateTree={onUpdateTree}
          />
        ))
      ) : (
        <div className="empty-tree">ファイルがありません</div>
      )}

      <style jsx>{`
        .empty-tree {
          padding: 1rem;
          font-style: italic;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
