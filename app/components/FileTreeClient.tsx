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
    <div className="tree-node" style={{ paddingLeft: `${level * 1.5}rem` }}>
      <div
        className={`node-content ${isActive ? "active" : ""}`}
        onClick={handleClick}
      >
        <span className="node-icon">
          {node.type === "directory" ? "📁" : "📄"}
        </span>
        <span className="node-name">{node.name}</span>
        {node.path && <MenuTrigger path={node.path} />}
      </div>

      {node.type === "directory" && isOpen && node.children && (
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
          font-size: 0.95rem;
        }
        .node-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          cursor: pointer;
          border-radius: 4px;
          transition: background-color 0.2s ease;
        }
        .node-content:hover {
          background-color: #f5f5f5;
        }
        .node-content.active {
          background-color: #e5f1ff;
          color: #0066cc;
        }
        .node-icon {
          flex-shrink: 0;
          width: 1.5rem;
          text-align: center;
        }
        .node-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .node-children {
          margin-top: 0.25rem;
        }
      `}</style>
    </div>
  );
}

export function FileTreeClient({
  tree,
  onFileSelect,
  onUpdateTree,
  className,
}: FileTreeClientProps) {
  return (
    <div className={className}>
      {tree.map((node) => (
        <TreeNode
          key={node.path ?? node.name}
          node={node}
          onFileSelect={onFileSelect}
          onUpdateTree={onUpdateTree}
        />
      ))}
    </div>
  );
}
