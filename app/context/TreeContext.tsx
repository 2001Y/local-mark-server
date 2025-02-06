"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { useSelectedLayoutSegments } from "next/navigation";
import { FileNode } from "../types/file";
import {
  isDefaultPath,
  normalizePath,
  generateTreeState,
} from "../lib/pathUtils";

interface TreeContextType {
  initialTree: FileNode[];
  updateTree: () => Promise<FileNode[]>;
  basePath: string;
  setBasePath: (path: string) => void;
  currentPath: string;
  setCurrentPath: (path: string) => void;
  isRoot: boolean;
}

const TreeContext = createContext<TreeContextType | null>(null);

interface TreeProviderProps {
  children: React.ReactNode;
  initialTree: FileNode[];
  updateTree: () => Promise<FileNode[]>;
}

export function TreeProvider({
  children,
  initialTree,
  updateTree,
}: TreeProviderProps) {
  const segments = useSelectedLayoutSegments();
  const [basePath, setBasePath] = useState(
    process.env.NEXT_PUBLIC_DEFAULT_MD_PATH + "/"
  );
  const [currentPath, setCurrentPath] = useState(
    process.env.NEXT_PUBLIC_DEFAULT_MD_PATH + "/"
  );
  const [isRoot, setIsRoot] = useState(true);

  // パスが変更されたときにisRootを更新
  useEffect(() => {
    setIsRoot(isDefaultPath(currentPath));
  }, [currentPath]);

  // URLセグメントが変更されたときにパスを更新
  useEffect(() => {
    if (segments.length > 0) {
      const fullPath = "/" + segments.join("/");
      const normalizedPath = normalizePath(fullPath);
      const { basePath: newBasePath, currentPath: newCurrentPath } =
        generateTreeState(normalizedPath);

      setBasePath(newBasePath);
      setCurrentPath(newCurrentPath);
    } else {
      setBasePath(process.env.NEXT_PUBLIC_DEFAULT_MD_PATH + "/");
      setCurrentPath(process.env.NEXT_PUBLIC_DEFAULT_MD_PATH + "/");
    }
  }, [segments]);

  return (
    <TreeContext.Provider
      value={{
        initialTree,
        updateTree,
        basePath,
        setBasePath,
        currentPath,
        setCurrentPath,
        isRoot,
      }}
    >
      {children}
    </TreeContext.Provider>
  );
}

export function useTree() {
  const context = useContext(TreeContext);
  if (!context) {
    throw new Error("useTree must be used within a TreeProvider");
  }
  return context;
}
