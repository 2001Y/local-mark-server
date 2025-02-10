"use client";

import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { FileNode } from "../types/file";
import { useTree } from "@/app/context/TreeContext";
import {
  normalizePath,
  generateUrl,
  generateTreeState,
} from "../lib/pathUtils";

interface SidebarWrapperProps {
  tree: FileNode[];
  onUpdateTree: () => Promise<FileNode[]>;
}

export function SidebarWrapper({ tree, onUpdateTree }: SidebarWrapperProps) {
  const router = useRouter();
  const { setCurrentPath } = useTree();

  const handleFileSelect = (path: string | undefined) => {
    const normalizedPath = normalizePath(path);
    const { currentPath } = generateTreeState(normalizedPath);
    const url = generateUrl(normalizedPath);
    setCurrentPath(currentPath);
    router.push(url);
  };

  return (
    <Sidebar
      tree={tree}
      onUpdateTree={onUpdateTree}
      onFileSelect={handleFileSelect}
    />
  );
}
