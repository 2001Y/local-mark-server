"use client";

import { useEffect } from "react";
import { useTree } from "../context/TreeContext";
import { normalizePath, generateTreeState } from "../lib/pathUtils";
import { FolderPage } from "../components/FolderPage";
import { FileEditor } from "./FileEditor";

interface PageClientProps {
  path: string;
  isDirectory: boolean;
  initialContent?: string;
}

export function PageClient({
  path,
  isDirectory,
  initialContent,
}: PageClientProps) {
  const { setBasePath, currentPath, setCurrentPath, initialTree, updateTree } =
    useTree();

  useEffect(() => {
    const normalizedPath = normalizePath(path);
    const { basePath: newBasePath, currentPath: newCurrentPath } =
      generateTreeState(normalizedPath);
    setCurrentPath(newCurrentPath);
  }, [path, setBasePath, setCurrentPath]);

  if (!currentPath) return null;

  return (
    <main className="flex-1 overflow-auto">
      {isDirectory ? (
        <FolderPage
          folderPath={currentPath}
          tree={initialTree}
          onUpdateTree={updateTree}
        />
      ) : (
        <FileEditor filePath={currentPath} initialContent={initialContent} />
      )}
    </main>
  );
}
