"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useSelectedLayoutSegments } from "next/navigation";
import { FileNode } from "../types/file";

interface TreeContextType {
  initialTree: FileNode[];
  updateTree: () => Promise<FileNode[]>;
  isRoot: boolean;
  basePath: string;
  currentPath: string;
  setBasePath: (path: string) => void;
  setCurrentPath: (path: string) => void;
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
  const [isRoot, setIsRoot] = useState(true);
  const [basePath, setBasePath] = useState("");
  const [currentPath, setCurrentPath] = useState("");

  // パスが変更されたときにisRootを更新
  useEffect(() => {
    setIsRoot(segments.length === 0);
  }, [segments]);

  return (
    <TreeContext.Provider
      value={{
        initialTree,
        updateTree,
        isRoot,
        basePath,
        currentPath,
        setBasePath,
        setCurrentPath,
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
