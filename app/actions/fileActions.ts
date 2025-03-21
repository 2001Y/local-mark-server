"use server";

import { revalidatePath } from "next/cache";
import * as fs from "fs/promises";
import * as path from "path";
import { OperationResult } from "../types/errors";
import { FileInfo, FileNode } from "../types/file";

const checkItemExists = async (itemPath: string): Promise<boolean> => {
  try {
    await fs.access(itemPath);
    return true;
  } catch {
    return false;
  }
};

export async function getFileContent(
  filePath: string
): Promise<OperationResult & { content?: string }> {
  try {
    const absolutePath = filePath.startsWith("/") ? filePath : `/${filePath}`;
    const decodedPath = decodeURIComponent(absolutePath);

    if (!(await checkItemExists(decodedPath))) {
      return {
        success: false,
        error: `ファイルが存在しません: ${decodedPath}`,
      };
    }

    const stats = await fs.stat(decodedPath);
    if (stats.isDirectory()) {
      return {
        success: false,
        error: `指定されたパスはディレクトリです: ${decodedPath}`,
      };
    }

    const content = await fs.readFile(decodedPath, "utf-8");
    return { success: true, content };
  } catch (error) {
    console.error("ファイル読み込みエラー:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "ファイルを読み込めませんでした",
    };
  }
}

export async function saveFile(
  filePath: string,
  content: string
): Promise<OperationResult> {
  try {
    // 環境変数で指定されたベースパスを使用
    const basePath = process.env.NEXT_PUBLIC_DEFAULT_MD_PATH;
    if (!basePath) {
      return {
        success: false,
        error: "NEXT_PUBLIC_DEFAULT_MD_PATH が設定されていません",
      };
    }

    // 相対パスの場合は、ベースパスからの相対パスとして扱う
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(basePath, filePath);
    const decodedPath = decodeURIComponent(absolutePath);

    let finalContent = content;
    try {
      while (typeof finalContent === "string" && finalContent.startsWith("{")) {
        finalContent = JSON.parse(finalContent).content;
      }
    } catch (error) {
      console.log("Content parsing failed, using as-is");
    }

    // ディレクトリが存在することを確認
    const directory = path.dirname(decodedPath);
    await fs.mkdir(directory, { recursive: true });

    await fs.writeFile(decodedPath, finalContent, "utf-8");
    revalidatePath("/[...path]");
    return { success: true };
  } catch (error) {
    console.error("ファイル保存エラー:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "ファイルを保存できませんでした",
    };
  }
}

export async function createFile(
  parentPath: string,
  name: string
): Promise<OperationResult> {
  try {
    const filePath = path.join(parentPath, name);

    if (await checkItemExists(filePath)) {
      return {
        success: false,
        message: "すでに同じ名前のアイテムが存在しています",
      };
    }

    await fs.writeFile(filePath, "");
    revalidatePath("/[...path]");
    return { success: true };
  } catch (error) {
    console.error("ファイル作成エラー");
    return {
      success: false,
      error: "アイテムが作成できませんでした",
    };
  }
}

export async function createFolder(
  parentPath: string,
  name: string
): Promise<OperationResult> {
  try {
    const folderPath = path.join(parentPath, name);

    if (await checkItemExists(folderPath)) {
      return {
        success: false,
        message: "すでに同じ名前のアイテムが存在しています",
      };
    }

    await fs.mkdir(folderPath);
    revalidatePath("/[...path]");
    return { success: true };
  } catch (error) {
    console.error("フォルダ作成エラー");
    return {
      success: false,
      error: "アイテムが作成できませんでした",
    };
  }
}

export async function deleteItem(
  itemPath: string,
  type: "file" | "directory"
): Promise<OperationResult> {
  try {
    if (type === "directory") {
      await fs.rm(itemPath, { recursive: true });
    } else {
      await fs.unlink(itemPath);
    }
    revalidatePath("/[...path]");
    return { success: true };
  } catch (error) {
    console.error("アイテム削除エラー");
    return {
      success: false,
      error: "アイテムを削除できませんでした",
    };
  }
}

export async function renameItem(
  oldPath: string,
  newName: string,
  type: "file" | "directory"
): Promise<OperationResult> {
  try {
    const dirPath = path.dirname(oldPath);
    const extension = type === "file" ? path.extname(oldPath) : "";
    const newPath = path.join(dirPath, newName + extension);

    if (await checkItemExists(newPath)) {
      return {
        success: false,
        message: "すでに同じ名前のアイテムが存在しています",
      };
    }

    await fs.rename(oldPath, newPath);
    revalidatePath("/[...path]");
    return { success: true };
  } catch (error) {
    console.error("名前変更エラー");
    return {
      success: false,
      error: "名前を変更できませんでした",
    };
  }
}

export async function getRecentFiles(
  basePath: string = process.env.NEXT_PUBLIC_DEFAULT_MD_PATH!,
  limit: number = 5
): Promise<OperationResult & { files?: FileInfo[] }> {
  try {
    const recentFiles: FileInfo[] = [];
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30日
    const now = Date.now();

    const absoluteBasePath = basePath.startsWith("/")
      ? basePath
      : `/${basePath}`;

    const collectFiles = async (dirPath: string) => {
      if (recentFiles.length >= limit) return;

      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const mdFiles = entries.filter(
        (entry) => entry.isFile() && entry.name.endsWith(".md")
      );
      const directories = entries.filter((entry) => entry.isDirectory());

      for (const entry of mdFiles) {
        if (recentFiles.length >= limit) break;

        const fullPath = path.join(dirPath, entry.name);
        const stats = await fs.stat(fullPath);

        if (now - stats.mtime.getTime() > maxAge) continue;

        recentFiles.push({
          path: fullPath,
          name: entry.name,
          isDirectory: false,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
        });
      }

      if (recentFiles.length < limit) {
        for (const dir of directories) {
          if (recentFiles.length >= limit) break;
          await collectFiles(path.join(dirPath, dir.name));
        }
      }
    };

    await collectFiles(absoluteBasePath);

    recentFiles.sort(
      (a, b) =>
        new Date(b.lastModified!).getTime() -
        new Date(a.lastModified!).getTime()
    );

    return { success: true, files: recentFiles };
  } catch (error) {
    console.error("最近のファイル取得エラー:", error);
    return {
      success: false,
      error: "最近のファイルを取得できませんでした",
    };
  }
}
