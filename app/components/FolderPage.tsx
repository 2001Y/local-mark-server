"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { getRecentFiles } from "./actions";
import path from "path";
import { FileInfo, FileNode } from "../types/file";
import { FileList } from "./FileList";
import { getUserNameFromPath } from "../lib/pathUtils";
import React from "react";
import { Icon } from "@iconify/react";
import { SearchTrigger } from "./SearchTrigger";
import { DirectoryList } from "./DirectoryList";
import { useRouter } from "next/navigation";
import { DirectoryListDemo } from "./DirectoryListDemo";
import { useMemoActions } from "../hooks/useMemoActions";

interface DirectoryContent {
  folders: FileNode[];
  files: FileNode[];
  folderContents: { folder: FileNode; files: FileNode[] }[];
}

// FileListセクションをメモ化
const FolderFilesSection = React.memo(
  ({
    files,
    onFileSelect,
    isRoot,
  }: {
    files: FileInfo[];
    onFileSelect: (file: FileInfo) => void;
    isRoot: boolean;
  }) => (
    <div className="recent-files">
      <h2>最近のファイル</h2>
      <FileList
        files={files}
        onFileSelect={onFileSelect}
        emptyMessage="最近開いたファイルはありません"
      />
    </div>
  )
);
FolderFilesSection.displayName = "FolderFilesSection";

// ディレクトリの内容を取得する関数
function getDirectoryContent(
  tree: FileNode[],
  segments: string[]
): DirectoryContent {
  if (!tree || tree.length === 0) {
    console.log("Empty tree received");
    return { folders: [], files: [], folderContents: [] };
  }

  console.log("Initial tree:", tree);
  console.log("Segments:", segments);

  // ルートディレクトリの場合は、treeをそのまま使用
  if (segments.length === 0) {
    console.log("Processing root directory");
    const folders = tree.filter((node) => node.type === "directory");
    const files = tree.filter((node) => node.type === "file");
    const folderContents = folders.map((folder) => {
      const folderFiles =
        folder.children?.filter((child) => child.type === "file") || [];
      const subFolders =
        folder.children?.filter((child) => child.type === "directory") || [];
      return {
        folder: {
          ...folder,
          children: subFolders,
        },
        files: folderFiles,
      };
    });
    return { folders, files, folderContents };
  }

  // サブディレクトリの場合は、パスに従ってノードを探索
  let currentNode: FileNode | undefined = tree.find(
    (node) => node.type === "directory" && node.name === "notes"
  );

  if (!currentNode) {
    console.log("Notes directory not found");
    return { folders: [], files: [], folderContents: [] };
  }

  // notesディレクトリ以降のパスを取得
  const notesIndex = segments.indexOf("notes");
  const targetSegments = notesIndex >= 0 ? segments.slice(notesIndex + 1) : [];
  console.log("Target segments:", targetSegments);

  // パスを順番に辿る
  for (const segment of targetSegments) {
    if (!currentNode?.children) {
      console.log("No children found for currentNode");
      break;
    }
    const nextNode: FileNode | undefined = currentNode.children.find((node) => {
      const basename = path.basename(node.path || "");
      console.log("Comparing:", { segment, basename, nodePath: node.path });
      return node.type === "directory" && basename === segment;
    });
    if (!nextNode) {
      console.log("No matching node found for segment:", segment);
      break;
    }
    currentNode = nextNode;
    console.log("Found directory:", nextNode.name);
  }

  if (!currentNode) {
    console.log("Target directory not found");
    return { folders: [], files: [], folderContents: [] };
  }

  console.log("Found target directory:", currentNode);

  // 現在のディレクトリ直下のフォルダとファイルを取得
  const folders =
    currentNode.children?.filter((node) => node.type === "directory") || [];
  const files =
    currentNode.children?.filter((node) => node.type === "file") || [];

  console.log("Found folders:", folders);
  console.log("Found files:", files);

  // フォルダの内容を取得（サブフォルダがある場合のみ）
  const folderContents =
    folders.length > 0
      ? folders.map((folder) => {
          const folderFiles =
            folder.children?.filter((child) => child.type === "file") || [];
          const subFolders =
            folder.children?.filter((child) => child.type === "directory") ||
            [];
          return {
            folder: {
              ...folder,
              children: subFolders,
            },
            files: folderFiles,
          };
        })
      : [];

  console.log("Generated folderContents:", folderContents);

  return { folders, files, folderContents };
}

interface FolderPageProps {
  folderPath: string;
  tree: FileNode[];
  onUpdateTree: () => Promise<FileNode[]>;
}

export function FolderPage({
  folderPath,
  tree,
  onUpdateTree,
}: FolderPageProps) {
  const router = useRouter();
  const [recentFiles, setRecentFiles] = useState<FileInfo[]>([]);
  const userName = getUserNameFromPath(folderPath);
  const defaultPath = process.env.NEXT_PUBLIC_DEFAULT_MD_PATH || "/content";
  const isRoot = folderPath === defaultPath || folderPath === "/";
  const currentPath = folderPath;
  const { navigateToQuickmemo } = useMemoActions();

  // folderPathからセグメントを取得
  const segments = useMemo(() => {
    if (isRoot) return [];
    // デフォルトパスより後ろの部分を取得
    const relativePath = folderPath
      .replace(defaultPath, "")
      .replace(/^\/+/, "");
    return relativePath.split("/").filter(Boolean);
  }, [folderPath, defaultPath, isRoot]);

  // 現在のディレクトリの内容を取得
  const currentDirContent = useMemo(() => {
    if (!tree) return { folders: [], files: [], folderContents: [] };
    console.log("Using segments:", segments);
    return getDirectoryContent(tree, segments);
  }, [tree, segments]);

  useEffect(() => {
    const loadRecentFiles = async () => {
      const result = await getRecentFiles(currentPath);
      if (result.success && result.files) {
        setRecentFiles(result.files);
      }
    };

    loadRecentFiles();
  }, [currentPath]);

  const handleQuickmemoClick = useCallback(() => {
    navigateToQuickmemo();
  }, [navigateToQuickmemo]);

  return (
    <div className="folder-container flex-1 overflow-auto">
      <div className="page-title">
        <h1>
          {isRoot ? (
            <>
              Hello, <span className="user-greeting">{userName}</span>.
            </>
          ) : (
            <>
              <span className="folder-icon">📁</span>
              {path.basename(decodeURIComponent(currentPath))}
            </>
          )}
        </h1>
      </div>

      <SearchTrigger folderPath={currentPath} className="mobile-search" />

      {/* 最近更新したファイルの一覧 */}
      <DirectoryList
        title={isRoot ? "最近更新したファイル" : "このフォルダ内の最近の更新"}
        tree={{
          folders: [],
          files: recentFiles.map((fileInfo) => ({
            name: fileInfo.name,
            type: "file" as const,
            path: fileInfo.path,
            mtime: fileInfo.lastModified,
          })),
        }}
        titleCollapse={true}
        filesLayout="scroll"
        foldersLayout="false"
      />

      {/* フォルダとファイルの一覧 */}
      {(currentDirContent.files.length > 0 ||
        currentDirContent.folders.length > 0) && (
        <DirectoryList
          title={isRoot ? "フォルダ一覧" : "このフォルダ内のフォルダ一覧"}
          tree={{
            folders: currentDirContent.folders,
            files: currentDirContent.files,
          }}
          titleCollapse={false}
          sectionLayout="list"
          filesLayout="grid"
          foldersLayout="collapse-close"
          showEmptyFolder={false}
          subFolder={{
            foldersLayout: "scroll",
            filesLayout: "grid",
            showEmptyFolder: false,
          }}
        />
      )}

      {/* {isRoot && <DirectoryListDemo currentDirContent={currentDirContent} />} */}

      <button onClick={handleQuickmemoClick} className="quickmemo-button">
        <Icon icon="ph:note-pencil" width={24} height={24} />
      </button>

      <style jsx>{`
        .folder-container {
          width: 100%;
          height: 100%;
          overflow: auto;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .page-title {
          padding-bottom: 1rem;
        }

        .page-title h1 {
          margin: 0;
          font-size: 1.8rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .user-greeting {
          text-transform: uppercase;
        }

        .folder-icon {
          font-size: 1.8rem;
        }

        .folder-path {
          margin: 0.5rem 0 0;
          font-size: 0.9rem;
        }

        h2 {
          margin: 0 0 1rem;
          font-size: 1.5rem;
        }

        .loading {
          text-align: center;
          padding: 1rem;
          background: #f5f5f5;
          border-radius: 4px;
        }

        .mobile-file-tree {
          border: solid 1px var(--bn-colors-hovered-background);
          border-radius: 8px;
          padding: 1rem;
        }

        .mobile-file-tree h2 {
          margin: 0 0 1rem;
          font-size: 1.2rem;
          padding-bottom: 0.5rem;
          border-bottom: solid 1px var(--bn-colors-hovered-background);
        }

        :global(.mobile-search) {
          max-width: 600px;
          display: block;
        }

        .quickmemo-button {
          position: fixed;
          right: 1.5rem;
          bottom: 1.5rem;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #0066cc;
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          transition: all 0.2s;
        }

        .quickmemo-button:hover {
          background: #0052a3;
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .folder-container {
            padding: 1rem;
          }

          .mobile-file-tree {
            margin-top: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
