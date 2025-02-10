"use server";

import { promises as fs } from "fs";
import path from "path";
import { FileNode } from "../types/file";

// 日付をフォーマットする関数
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0].replace(/-/g, "/");
}

async function getDirectoryTree(dirPath: string): Promise<FileNode[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    // すべてのディレクトリで直接子要素を返す
    const tree = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        const stats = await fs.stat(fullPath);

        if (entry.isDirectory()) {
          const children = await getDirectoryTree(fullPath);
          return {
            name: entry.name,
            type: "directory",
            path: fullPath,
            children,
            mtime: formatDate(stats.mtime),
          };
        }
        if (entry.isFile() && entry.name.endsWith(".md")) {
          return {
            name: entry.name,
            type: "file",
            path: fullPath,
            mtime: formatDate(stats.mtime),
          };
        }
        return null;
      })
    );
    return tree.filter(Boolean) as FileNode[];
  } catch (error) {
    console.error("Error reading directory:", dirPath, error);
    throw error;
  }
}

const rootPath = process.env.NEXT_PUBLIC_DEFAULT_MD_PATH!;

export async function getInitialTree() {
  return getDirectoryTree(rootPath);
}

export async function updateTree() {
  return getDirectoryTree(rootPath);
}

export async function FileTreeServer() {
  const initialTree = await getInitialTree();
  return {
    initialTree,
    updateTree,
  };
}
