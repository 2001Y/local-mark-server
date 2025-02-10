"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import * as fs from "fs/promises";
import * as path from "path";
import { OperationResult } from "../types/errors";
import { FileInfo, FileNode } from "../types/file";
import { normalizePath, toFsPath } from "../lib/pathUtils";

const checkItemExists = async (itemPath: string): Promise<boolean> => {
  try {
    await fs.access(itemPath);
    return true;
  } catch {
    return false;
  }
};

export type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

export async function getFileContent(
  filePath: string
): Promise<ActionResult<string>> {
  try {
    const fsPath = toFsPath(filePath);

    // ファイルの存在確認
    try {
      const stats = await fs.stat(fsPath);
      if (stats.isDirectory()) {
        return {
          success: false,
          error: `指定されたパスはディレクトリです: ${filePath}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `ファイルが存在しません: ${filePath}`,
      };
    }

    const content = await fs.readFile(fsPath, "utf-8");
    return { success: true, data: content };
  } catch (error) {
    console.error("Error reading file:", error);
    return {
      success: false,
      error: "ファイルの読み込みに失敗しました",
    };
  }
}

export async function saveFile(
  filePath: string,
  content: string
): Promise<ActionResult> {
  try {
    const fsPath = toFsPath(filePath);
    await fs.writeFile(fsPath, content, "utf-8");
    revalidatePath("/[...path]", "page");
    revalidateTag("files");
    return { success: true };
  } catch (error) {
    console.error("Error saving file:", error);
    return {
      success: false,
      error: "ファイルの保存に失敗しました",
    };
  }
}

export async function createFile(
  parentPath: string,
  fileName: string
): Promise<ActionResult> {
  try {
    const normalizedParentPath = normalizePath(parentPath);
    const filePath = path.join(normalizedParentPath, fileName);

    // Check if file already exists
    try {
      await fs.access(filePath);
      return {
        success: false,
        error: "同名のファイルが既に存在します",
      };
    } catch {
      // File doesn't exist, proceed with creation
    }

    await fs.writeFile(filePath, "", "utf-8");
    revalidatePath("/[...path]");
    revalidateTag("files");
    return { success: true };
  } catch (error) {
    console.error("Error creating file:", error);
    return {
      success: false,
      error: "ファイルの作成に失敗しました",
    };
  }
}

export async function createFolder(
  parentPath: string,
  folderName: string
): Promise<ActionResult> {
  try {
    const normalizedParentPath = normalizePath(parentPath);
    const folderPath = path.join(normalizedParentPath, folderName);

    // Check if folder already exists
    try {
      await fs.access(folderPath);
      return {
        success: false,
        error: "同名のフォルダが既に存在します",
      };
    } catch {
      // Folder doesn't exist, proceed with creation
    }

    await fs.mkdir(folderPath);
    revalidatePath("/[...path]");
    revalidateTag("files");
    return { success: true };
  } catch (error) {
    console.error("Error creating folder:", error);
    return {
      success: false,
      error: "フォルダの作成に失敗しました",
    };
  }
}

export async function deleteItem(
  itemPath: string,
  type: "file" | "directory"
): Promise<ActionResult> {
  try {
    const normalizedPath = normalizePath(itemPath);

    if (type === "directory") {
      await fs.rm(normalizedPath, { recursive: true });
    } else {
      await fs.unlink(normalizedPath);
    }

    revalidatePath("/[...path]");
    revalidateTag("files");
    return { success: true };
  } catch (error) {
    console.error("Error deleting item:", error);
    return {
      success: false,
      error: "削除に失敗しました",
    };
  }
}

export async function renameItem(
  oldPath: string,
  newName: string,
  type: "file" | "directory"
): Promise<ActionResult> {
  try {
    const normalizedOldPath = normalizePath(oldPath);
    const parentDir = path.dirname(normalizedOldPath);
    const newPath = path.join(parentDir, newName);

    // Check if target already exists
    try {
      await fs.access(newPath);
      return {
        success: false,
        error: "同名のファイル/フォルダが既に存在します",
      };
    } catch {
      // Target doesn't exist, proceed with rename
    }

    await fs.rename(normalizedOldPath, newPath);
    revalidatePath("/[...path]");
    revalidateTag("files");
    return { success: true };
  } catch (error) {
    console.error("Error renaming item:", error);
    return {
      success: false,
      error: "名前の変更に失敗しました",
    };
  }
}

export async function getRecentFiles(): Promise<
  ActionResult<{ path: string; name: string }[]>
> {
  try {
    const defaultPath = process.env.NEXT_PUBLIC_DEFAULT_MD_PATH!;
    const normalizedPath = normalizePath(defaultPath);

    const files = await fs.readdir(normalizedPath, { withFileTypes: true });
    const mdFiles = files
      .filter((file) => file.isFile() && file.name.endsWith(".md"))
      .map((file) => ({
        path: path.join(defaultPath, file.name),
        name: file.name,
      }))
      .sort((a, b) => b.name.localeCompare(a.name));

    return { success: true, data: mdFiles };
  } catch (error) {
    console.error("Error getting recent files:", error);
    return {
      success: false,
      error: "最近のファイル一覧の取得に失敗しました",
    };
  }
}
