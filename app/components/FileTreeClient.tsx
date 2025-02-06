"use client";

import {
  useCallback,
  useState,
  useRef,
  useEffect,
  forwardRef,
  ForwardedRef,
  useMemo,
} from "react";
import { Menu, Paper } from "@mantine/core";
import { createFile, createFolder, deleteItem, renameItem } from "./actions";
import { FileNode } from "../types/file";
import path from "path";
import { ContextMenu, MenuTrigger } from "./ContextMenu";
import { useTree } from "@/app/context/TreeContext";
import {
  normalizePath,
  generateUrl,
  generateTreeState,
  updateUrl,
  isDefaultPath,
  cleanPathForComparison,
} from "../lib/pathUtils";
import Link from "next/link";

interface FileTreeNodeProps {
  node: FileNode;
  selectedPath?: string | null;
  onContextMenu: (state: {
    position: { x: number; y: number };
    type: "background" | "file" | "directory";
    targetPath?: string;
    node?: FileNode;
  }) => void;
  level?: number;
  onUpdateTree?: () => void;
}

interface FileTreeNodeHandle {
  handleRename: () => void;
}

// FileTreeNodeコンポーネント
const FileTreeNode = forwardRef(function FileTreeNode(
  {
    node,
    selectedPath,
    onContextMenu,
    level = 0,
    onUpdateTree,
  }: FileTreeNodeProps,
  ref: ForwardedRef<FileTreeNodeHandle>
) {
  const [isExpanded, setIsExpanded] = useState(
    level === 0 && node.type === "directory"
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSelected = selectedPath === node.path;
  const normalizedPath = useMemo(
    () => `/${normalizePath(node.path || "")}`,
    [node.path]
  );

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isEditing) return;
    if (node.type === "directory") {
      setIsExpanded(!isExpanded);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isEditing) return;
    onContextMenu({
      position: { x: e.clientX, y: e.clientY },
      type: node.type,
      targetPath: node.path,
      node: node,
    });
  };

  const handleRename = useCallback(() => {
    setIsEditing(true);
    setEditName(node.name);
  }, [node.name]);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
    setEditName(node.name);
  }, [node.name]);

  const handleEditSubmit = useCallback(async () => {
    if (editName.trim() && editName !== node.name && node.path) {
      const result = await renameItem(node.path, editName.trim(), node.type);
      if (result.success) {
        onUpdateTree?.();
      }
    }
    setIsEditing(false);
  }, [editName, node.name, node.path, node.type, onUpdateTree]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      handleEditSubmit();
    } else if (e.key === "Escape") {
      handleEditCancel();
    }
  };

  const handleMenuTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) return;
    onContextMenu({
      position: { x: e.clientX, y: e.clientY },
      type: node.type,
      targetPath: node.path,
      node: node,
    });
  };

  useEffect(() => {
    if (ref && typeof ref === "object") {
      ref.current = { handleRename };
    }
  }, [ref, handleRename]);

  return (
    <div className="node-container">
      {node.type === "directory" ? (
        <Link href={normalizedPath} className="node-link">
          <div
            className={`tree-node ${isSelected ? "selected" : ""} ${
              isEditing ? "editing" : ""
            }`}
            onClick={handleExpandToggle}
            onContextMenu={handleContextMenu}
            style={{ paddingLeft: `${level * 20}px` }}
            data-path={node.path}
          >
            <span className="node-icon">{isExpanded ? "📂" : "📁"}</span>
            {isEditing ? (
              <input
                ref={inputRef}
                className="node-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleEditSubmit}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="node-content">
                {node.name}
                <MenuTrigger onClick={handleMenuTriggerClick} />
              </div>
            )}
          </div>
        </Link>
      ) : (
        <Link href={normalizedPath} className="node-link">
          <div
            className={`tree-node ${isSelected ? "selected" : ""} ${
              isEditing ? "editing" : ""
            }`}
            style={{ paddingLeft: `${level * 20}px` }}
            data-path={node.path}
            onContextMenu={handleContextMenu}
          >
            <span className="node-icon">📄</span>
            {isEditing ? (
              <input
                ref={inputRef}
                className="node-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleEditSubmit}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="node-content">
                <span className="node-name">{node.name}</span>
                <MenuTrigger onClick={handleMenuTriggerClick} />
              </div>
            )}
          </div>
        </Link>
      )}
      {node.type === "directory" && isExpanded && node.children && (
        <div className="children">
          {node.children.map((child, index) => (
            <FileTreeNode
              key={`${child.path}-${index}`}
              node={child}
              selectedPath={selectedPath}
              onContextMenu={onContextMenu}
              level={level + 1}
              onUpdateTree={onUpdateTree}
            />
          ))}
        </div>
      )}
      <style jsx global>{`
        .node-container {
          width: 100%;
        }
        .node-link {
          text-decoration: none;
          color: inherit;
          display: block;
        }
        .tree-node {
          display: flex;
          align-items: center;
          padding: 4px 8px;
          cursor: pointer;
          user-select: none;
          border-radius: 4px;
          gap: 8px;
        }
        .tree-node:hover {
          background-color: #f5f5f5;
        }
        .tree-node.selected {
          background-color: #e5f1ff;
        }
        .tree-node.editing {
          background-color: #fff;
          cursor: text;
        }
        .node-icon {
          font-size: 1.1em;
          flex-shrink: 0;
        }
        .node-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .node-input {
          flex: 1;
          padding: 2px 4px;
          margin: -2px 0;
          border: 1px solid #ccc;
          border-radius: 4px;
          background: white;
          font-size: inherit;
          font-family: inherit;
          outline: none;
        }
        .node-input:focus {
          border-color: #0066cc;
          box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
        }
        .children {
          margin-left: 8px;
        }
        .node-content {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 4px;
          min-width: 0;
        }
      `}</style>
    </div>
  );
});

interface FileTreeClientProps {
  tree: FileNode[];
  onFileSelect: (path: string | undefined) => void;
  onUpdateTree?: () => void;
  className?: string;
}

export function FileTreeClient({
  tree,
  onFileSelect,
  onUpdateTree,
  className = "",
}: FileTreeClientProps) {
  const { basePath, setBasePath, currentPath, setCurrentPath } = useTree();
  const [localTree, setLocalTree] = useState<FileNode[]>(tree);
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number };
    type: "background" | "file" | "directory";
    targetPath?: string;
    node?: FileNode;
  } | null>(null);

  const nodeElements = useRef(new Map<string, FileTreeNodeHandle>()).current;
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  const triggerUpdate = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      onUpdateTree?.();
    }, 100);
  }, [onUpdateTree]);

  // ベースパスに基づいてツリーをフィルタリング
  const filteredTree = useMemo(() => {
    const cleanBasePath = cleanPathForComparison(basePath);

    if (isDefaultPath(cleanBasePath)) {
      return localTree;
    }

    // 完全なパスで一致するノードを探す
    const findNodeByPath = (
      nodes: FileNode[],
      targetPath: string
    ): FileNode[] => {
      const cleanTargetPath = cleanPathForComparison(targetPath);

      for (const node of nodes) {
        if (!node.path) continue;
        const cleanNodePath = cleanPathForComparison(node.path);

        if (cleanNodePath === cleanTargetPath && node.children) {
          return node.children;
        }
        if (node.children) {
          const found = findNodeByPath(node.children, targetPath);
          if (found.length > 0) {
            return found;
          }
        }
      }
      return [];
    };

    const result = findNodeByPath(localTree, cleanBasePath);
    return result.length > 0 ? result : localTree;
  }, [localTree, basePath]);

  // ツリーの更新を監視
  useEffect(() => {
    setLocalTree(tree);
  }, [tree]);

  // basePathの変更を監視してツリーを更新
  useEffect(() => {
    if (onUpdateTree) {
      onUpdateTree();
    }
  }, [basePath, onUpdateTree]);

  const handleContextMenu = useCallback(
    (state: {
      position: { x: number; y: number };
      type: "background" | "file" | "directory";
      targetPath?: string;
      node?: FileNode;
    }) => {
      setContextMenu(state);
    },
    []
  );

  const handleCreateFile = useCallback(
    async (parentPath: string = basePath) => {
      const result = await createFile(parentPath, "新規ファイル.md");
      if (result.success) {
        triggerUpdate();
        setContextMenu(null);
      }
    },
    [basePath, triggerUpdate]
  );

  const handleCreateFolder = useCallback(
    async (parentPath: string = basePath) => {
      const result = await createFolder(parentPath, "新規フォルダ");
      if (result.success) {
        triggerUpdate();
        setContextMenu(null);
      }
    },
    [basePath, triggerUpdate]
  );

  const handleDelete = useCallback(
    async (node: FileNode) => {
      if (node.path) {
        const result = await deleteItem(node.path, node.type);
        if (result.success) {
          triggerUpdate();
          setContextMenu(null);
        }
      }
    },
    [triggerUpdate]
  );

  const handleRename = useCallback(
    (node: FileNode) => {
      if (node.path) {
        const component = nodeElements.get(node.path);
        if (component) {
          component.handleRename();
          setContextMenu(null);
        }
      }
    },
    [nodeElements]
  );

  const handleBackClick = useCallback(() => {
    if (basePath) {
      console.log("[FileTreeClient] Back click, current base path:", basePath);
      const parentPath = path.dirname(basePath.replace(/\/*$/, ""));
      const defaultPath = process.env.NEXT_PUBLIC_DEFAULT_MD_PATH;
      const normalizedParentPath = normalizePath(parentPath);
      const normalizedDefaultPath = normalizePath(defaultPath);

      // デフォルトパスより上の階層には戻れないようにする
      if (
        normalizedParentPath === normalizedDefaultPath ||
        parentPath === "."
      ) {
        const { basePath: newBasePath, currentPath } = generateTreeState(
          normalizedDefaultPath
        );
        const url = generateUrl(normalizedDefaultPath);

        setBasePath(newBasePath);
        setCurrentPath(currentPath);
        router.push(url);
      } else {
        const { basePath: newBasePath, currentPath } =
          generateTreeState(normalizedParentPath);
        const url = generateUrl(normalizedParentPath);

        setBasePath(newBasePath);
        setCurrentPath(currentPath);
        router.push(url);
      }
    }
  }, [basePath, setBasePath, setCurrentPath]);

  const isAtDefaultPath = useMemo(() => {
    return isDefaultPath(basePath);
  }, [basePath]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (contextMenu) {
        const menuElement = document.querySelector(".context-menu");
        if (!menuElement?.contains(e.target as Node)) {
          setContextMenu(null);
        }
      }
    };

    if (contextMenu) {
      document.addEventListener("click", handleGlobalClick);
    }

    return () => {
      document.removeEventListener("click", handleGlobalClick);
    };
  }, [contextMenu]);

  return (
    <div className={`file-tree ${className}`}>
      {basePath && !isAtDefaultPath && (
        <div className="back-button" onClick={handleBackClick}>
          ← 戻る
        </div>
      )}
      {filteredTree.length > 0 ? (
        filteredTree.map((node, index) =>
          node.path ? (
            <FileTreeNode
              key={`${node.path}-${index}`}
              ref={(el: FileTreeNodeHandle | null) => {
                if (el) {
                  nodeElements.set(node.path!, el);
                } else {
                  nodeElements.delete(node.path!);
                }
              }}
              node={node}
              selectedPath={currentPath}
              onContextMenu={handleContextMenu}
              onUpdateTree={onUpdateTree}
            />
          ) : null
        )
      ) : (
        <div className="empty-state">No files found</div>
      )}

      {contextMenu && (
        <ContextMenu
          opened={true}
          onClose={() => setContextMenu(null)}
          position={contextMenu.position}
          type={contextMenu.type}
          targetPath={contextMenu.targetPath}
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFolder}
          onRename={handleRename}
          onDelete={handleDelete}
          node={contextMenu.node}
        />
      )}

      <style jsx>{`
        .file-tree {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
          position: relative;
        }

        .back-button {
          padding: 8px;
          margin-bottom: 8px;
          cursor: pointer;
          user-select: none;
          border-radius: 4px;
          background-color: #f5f5f5;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .back-button:hover {
          background-color: #e5e5e5;
        }

        .empty-state {
          padding: 1rem;
          text-align: center;
          color: #666;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .file-tree {
            border: 1px solid #eaeaea;
            border-radius: 8px;
            margin: 1rem 0;
          }
        }
      `}</style>
    </div>
  );
}
