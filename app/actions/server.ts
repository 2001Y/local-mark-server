"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import * as fs from "fs/promises";
import * as path from "path";
import { OperationResult } from "../types/errors";
import { FileInfo, FileNode } from "../types/file";
import { normalizePath, toFsPath } from "../lib/pathUtils";
import { ensureDirectoryExists } from "../lib/fileSystem";

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
  console.log(`[getFileContent] 開始: パス="${filePath}"`);

  try {
    const fsPath = toFsPath(filePath);
    console.log(`[getFileContent] ファイルシステムパス: "${fsPath}"`);

    // ファイルの存在確認
    try {
      const stats = await fs.stat(fsPath);
      console.log(`[getFileContent] ファイル情報:`, {
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        mtime: stats.mtime,
        path: filePath,
        fsPath: fsPath,
      });

      if (stats.isDirectory()) {
        console.log(
          `[getFileContent] エラー: 指定されたパスはディレクトリです: ${filePath}`
        );
        return {
          success: false,
          error: `指定されたパスはディレクトリです: ${filePath}`,
        };
      }
    } catch (error) {
      console.log(
        `[getFileContent] エラー: ファイルが存在しません: ${filePath}`,
        error
      );

      // ファイルが存在しない場合は空のファイルを返す
      console.log(`[getFileContent] 空のファイルを返します: ${filePath}`);
      return {
        success: true,
        data: "",
      };
    }

    console.log(`[getFileContent] ファイル読み込み開始: "${fsPath}"`);
    const content = await fs.readFile(fsPath, "utf-8");
    console.log(
      `[getFileContent] ファイル読み込み成功: 長さ=${content.length}`
    );

    // 内容の先頭部分をログに出力
    const preview =
      content.length > 100 ? content.substring(0, 100) + "..." : content;
    console.log(`[getFileContent] ファイル内容プレビュー: "${preview}"`);

    // ファイル内容の詳細情報
    console.log(`[getFileContent] ファイル内容の詳細:`, {
      length: content.length,
      isEmpty: content.trim() === "",
      firstLine: content.split("\n")[0] || "",
      lineCount: content.split("\n").length,
      containsMarkdown: /[#*_`]/.test(content), // 簡易的なMarkdown判定
      containsHTML: /<\/?[a-z][\s\S]*>/i.test(content), // 簡易的なHTML判定
      encoding: "utf-8",
      contentType: "text/markdown", // 明示的にMarkdownとして扱う
    });

    return { success: true, data: content };
  } catch (error) {
    console.error("[getFileContent] ファイル読み込みエラー:", error);
    console.error("[getFileContent] エラーの詳細:", {
      path: filePath,
      errorType: error instanceof Error ? "Error" : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });

    // エラーが発生した場合も空のファイルを返す
    console.log(
      `[getFileContent] エラーが発生したため空のファイルを返します: ${filePath}`
    );
    return {
      success: true,
      data: "",
    };
  }
}

export async function saveFile(
  filePath: string,
  content: string
): Promise<ActionResult> {
  console.log(
    `[saveFile] 保存開始: パス="${filePath}", コンテンツ長=${
      content?.length || 0
    }`
  );

  // 追加デバッグログ - 入力パスの詳細
  console.log(`[saveFile] 入力パスの詳細:`, {
    originalPath: filePath,
    isAbsolute: filePath.startsWith("/"),
    pathComponents: filePath.split("/"),
    containsJapanese:
      /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(
        filePath
      ),
    envDefaultPath: process.env.NEXT_PUBLIC_DEFAULT_MD_PATH,
  });

  if (!content) {
    const errorMsg = "コンテンツが空です";
    console.error(`[saveFile] エラー: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  try {
    // パスの変換
    console.log(`[saveFile] パス変換前: "${filePath}"`);
    const fsPath = toFsPath(filePath);
    console.log(`[saveFile] パス変換後: "${fsPath}"`);

    // ディレクトリの作成
    const dir = path.dirname(fsPath);
    console.log(`[saveFile] ディレクトリ確認: "${dir}"`);

    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`[saveFile] ディレクトリ作成成功: "${dir}"`);
    } catch (dirError) {
      console.error(`[saveFile] ディレクトリ作成エラー:`, dirError);
      console.error(`[saveFile] ディレクトリ作成エラーの詳細:`, {
        directory: dir,
        errorType: dirError instanceof Error ? "Error" : typeof dirError,
        errorMessage:
          dirError instanceof Error ? dirError.message : String(dirError),
      });
      return {
        success: false,
        error: `ディレクトリ作成エラー: ${
          dirError instanceof Error ? dirError.message : String(dirError)
        }`,
      };
    }

    // ファイルの書き込み
    try {
      console.log(`[saveFile] ファイル書き込み開始: "${fsPath}"`);
      await fs.writeFile(fsPath, content, "utf-8");
      console.log(`[saveFile] ファイル書き込み成功: "${fsPath}"`);

      // キャッシュの更新
      try {
        revalidatePath("/[...path]", "page");
        revalidateTag("files");
        console.log(`[saveFile] キャッシュ更新成功`);
      } catch (cacheError) {
        console.warn(`[saveFile] キャッシュ更新失敗:`, cacheError);
        // キャッシュ更新の失敗は無視して続行
      }

      return { success: true };
    } catch (writeError) {
      console.error(`[saveFile] ファイル書き込みエラー:`, writeError);
      console.error(`[saveFile] ファイル書き込みエラーの詳細:`, {
        filePath: fsPath,
        contentLength: content.length,
        errorType: writeError instanceof Error ? "Error" : typeof writeError,
        errorMessage:
          writeError instanceof Error ? writeError.message : String(writeError),
        errorStack: writeError instanceof Error ? writeError.stack : undefined,
      });
      return {
        success: false,
        error: `ファイル書き込みエラー: ${
          writeError instanceof Error ? writeError.message : String(writeError)
        }`,
      };
    }
  } catch (error) {
    console.error(`[saveFile] 予期せぬエラー:`, error);
    console.error(`[saveFile] エラーの詳細:`, {
      path: filePath,
      contentLength: content?.length || 0,
      errorType: error instanceof Error ? "Error" : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: `ファイル保存エラー: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

export async function createFile(
  parentPath: string,
  fileName: string
): Promise<ActionResult> {
  try {
    if (!parentPath) {
      return {
        success: false,
        error: "親ディレクトリのパスが指定されていません",
      };
    }

    if (!fileName) {
      return {
        success: false,
        error: "ファイル名が指定されていません",
      };
    }

    const normalizedParentPath = normalizePath(parentPath);
    const filePath = path.join(normalizedParentPath, fileName);

    console.log("Creating file:", {
      parentPath,
      fileName,
      normalizedParentPath,
      filePath,
    });

    // 親ディレクトリの存在確認と作成
    const dirExists = await ensureDirectoryExists(normalizedParentPath);
    if (!dirExists) {
      return {
        success: false,
        error: "親ディレクトリの作成に失敗しました",
      };
    }

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

    try {
      await fs.writeFile(filePath, "", "utf-8");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "不明なエラー";
      console.error("File creation error:", error);
      return {
        success: false,
        error: `ファイルの作成に失敗しました: ${errorMessage}`,
      };
    }

    revalidatePath("/[...path]");
    revalidateTag("files");
    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラー";
    console.error("Error in createFile:", error);
    return {
      success: false,
      error: `ファイルの作成に失敗しました: ${errorMessage}`,
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
