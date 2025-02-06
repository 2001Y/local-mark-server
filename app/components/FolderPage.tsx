"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { getRecentFiles } from "./actions";
import path from "path";
import { FileInfo, FileNode } from "../types/file";
import { FileList } from "./FileList";
import { isDefaultPath, cleanPathForComparison } from "../lib/pathUtils";
import React from "react";
import { Icon } from "@iconify/react";
import { SearchTrigger } from "./SearchTrigger";
import { DirectoryList } from "./DirectoryList";
import { useTree } from "@/app/context/TreeContext";
import { useRouter } from "next/navigation";

interface FolderPageProps {
  folderPath: string;
}

interface DirectoryContent {
  folders: FileNode[];
  files: FileNode[];
  folderContents: { folder: FileNode; files: FileNode[] }[];
}

// FileNodeをFileInfoに変換する関数
const convertToFileInfo = (node: FileNode): FileInfo => {
  return {
    path: node.path!,
    name: path.basename(node.path!),
    isDirectory: node.type === "directory",
    // ここでは仮の値を設定。実際のファイルサイズと更新日時は別途取得する必要があります
    size: 0,
    lastModified: new Date(),
  };
};

// ヘッダーコンポーネントをメモ化
const Header = React.memo(
  ({
    folderPath,
    isRoot,
    userName,
  }: {
    folderPath: string;
    isRoot: boolean;
    userName: string;
  }) => (
    <div className="folder-header">
      <h1>
        {isRoot ? (
          <>Hello, {userName}</>
        ) : (
          <>
            <span className="folder-icon">📁</span>
            {path.basename(folderPath)}
          </>
        )}
      </h1>
      <p className="folder-path">{folderPath}</p>
    </div>
  )
);
Header.displayName = "Header";

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

export function FolderPage({ folderPath }: FolderPageProps) {
  const { initialTree, updateTree } = useTree();
  const router = useRouter();
  const [recentFiles, setRecentFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const isRoot = folderPath === process.env.NEXT_PUBLIC_DEFAULT_MD_PATH + "/";
  const userName = process.env.NEXT_PUBLIC_USER_NAME || "User";

  // 現在のディレクトリの内容を取得
  const currentDirContent = useMemo(() => {
    if (!initialTree) return { folders: [], files: [], folderContents: [] };

    const findContent = (
      nodes: FileNode[],
      targetPath: string
    ): {
      folders: FileNode[];
      files: FileNode[];
      folderContents: { folder: FileNode; files: FileNode[] }[];
    } => {
      const cleanTargetPath = cleanPathForComparison(targetPath);

      // デフォルトパスの場合はルートのコンテンツを返す
      if (isDefaultPath(cleanTargetPath)) {
        const folders = nodes.filter((node) => node.type === "directory");
        return {
          folders,
          files: nodes.filter((node) => node.type === "file"),
          folderContents: folders.map((folder) => ({
            folder,
            files:
              folder.children?.filter((child) => child.type === "file") || [],
          })),
        };
      }

      // 対象のディレクトリを探す
      for (const node of nodes) {
        if (!node.path) continue;
        const cleanNodePath = cleanPathForComparison(node.path);

        if (cleanNodePath === cleanTargetPath && node.type === "directory") {
          const folders =
            node.children?.filter((child) => child.type === "directory") || [];
          return {
            folders,
            files:
              node.children?.filter((child) => child.type === "file") || [],
            folderContents: folders.map((folder) => ({
              folder,
              files:
                folder.children?.filter((child) => child.type === "file") || [],
            })),
          };
        }
        if (node.children) {
          const result = findContent(node.children, targetPath);
          if (result.folders.length > 0 || result.files.length > 0) {
            return result;
          }
        }
      }
      return { folders: [], files: [], folderContents: [] };
    };

    return findContent(initialTree, folderPath);
  }, [initialTree, folderPath]);

  // メディアクエリの監視を追加
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    setIsMobile(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const loadRecentFiles = async () => {
      setIsLoading(true);
      const result = await getRecentFiles(folderPath);
      if (result.success && result.files) {
        setRecentFiles(result.files);
      }
      setIsLoading(false);
    };

    loadRecentFiles();
  }, [folderPath]);

  const handleQuickmemoClick = useCallback(() => {
    router.push("/quickmemo");
  }, [router]);

  return (
    <div className="folder-container">
      <div className="folder-header">
        <h1>
          {isRoot ? (
            <>Hello, {userName}</>
          ) : (
            <>
              <span className="folder-icon">📁</span>
              {path.basename(folderPath)}
            </>
          )}
        </h1>
        <p className="folder-path">{folderPath}</p>
      </div>

      <SearchTrigger folderPath={folderPath} className="mobile-search" />

      <DirectoryList
        title="最近のファイル"
        files={recentFiles}
        layout="scroll"
      />

      {currentDirContent.folderContents.map(({ folder, files }) => {
        const subFolders =
          folder.children?.filter((child) => child.type === "directory") || [];

        return (
          <DirectoryList
            key={folder.path}
            title={path.basename(folder.path!)}
            folders={subFolders}
            files={files.map(convertToFileInfo)}
            layout="scroll"
          />
        );
      })}

      {currentDirContent.files.length > 0 && (
        <DirectoryList
          title={`${path.basename(folderPath)}のファイル`}
          files={currentDirContent.files.map(convertToFileInfo)}
          layout="grid"
        />
      )}

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

        .folder-header {
          border-bottom: 1px solid #eaeaea;
          padding-bottom: 1rem;
        }

        .folder-header h1 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          font-size: 1.8rem;
          color: #333;
        }

        .folder-icon {
          font-size: 1.8rem;
        }

        .folder-path {
          margin: 0.5rem 0 0;
          color: #666;
          font-size: 0.9rem;
        }

        h2 {
          margin: 0 0 1rem;
          font-size: 1.5rem;
          color: #333;
        }

        .loading {
          text-align: center;
          padding: 1rem;
          color: #666;
          background: #f5f5f5;
          border-radius: 4px;
        }

        .mobile-file-tree {
          border: 1px solid #eaeaea;
          border-radius: 8px;
          padding: 1rem;
          background: white;
        }

        .mobile-file-tree h2 {
          margin: 0 0 1rem;
          font-size: 1.2rem;
          color: #333;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #eaeaea;
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
          display: none;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          transition: all 0.2s;
        }

        .quickmemo-button:hover {
          background: #0052a3;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        @media (max-width: 768px) {
          .folder-container {
            padding: 1rem;
          }

          .mobile-file-tree {
            margin-top: 1rem;
          }

          .quickmemo-button {
            display: flex;
          }
        }
      `}</style>
    </div>
  );
}
