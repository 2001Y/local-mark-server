"use server";

import { toast } from "sonner";
import { revalidatePath, revalidateTag } from "next/cache";
import * as fs from "fs/promises";
import * as path from "path";
import { ActionResult } from "./server";
import { generateUniqueFileName } from "../lib/fileUtils";
import { normalizePath, toFsPath, appPaths } from "../lib/pathUtils";

/**
 * 新規メモを作成するための統合関数
 * サーバーコンポーネント、クライアントコンポーネントどちらからでも利用可能
 */
export async function createMemo({
  fileName,
  content = "",
  parentPath = appPaths.defaultMdPath,
  useTimestamp = true,
}: {
  fileName?: string;
  content?: string;
  parentPath?: string;
  useTimestamp?: boolean;
}): Promise<ActionResult<{ path: string }>> {
  console.log("[createMemo] 開始", { fileName, parentPath, useTimestamp });

  try {
    // パラメータのバリデーション
    if (!parentPath) {
      console.error("[createMemo] 親ディレクトリパスが指定されていません");
      return {
        success: false,
        error: "保存先のパスが指定されていません",
      };
    }

    // ファイル名の生成または検証
    let finalFileName = fileName || "";
    if (!finalFileName && useTimestamp) {
      finalFileName = generateUniqueFileName();
      console.log(
        `[createMemo] タイムスタンプからファイル名を生成: ${finalFileName}`
      );
    }

    // 拡張子の追加
    if (!finalFileName.endsWith(".md")) {
      finalFileName = `${finalFileName}.md`;
    }

    // 完全なファイルパスの作成
    const normalizedParentPath = normalizePath(parentPath);
    const filePath = path.join(normalizedParentPath, finalFileName);
    const fsPath = toFsPath(filePath);

    console.log("[createMemo] パス情報", {
      normalizedParentPath,
      filePath,
      fsPath,
    });

    // ディレクトリの作成（存在しない場合）
    const dir = path.dirname(fsPath);
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`[createMemo] ディレクトリ作成成功: "${dir}"`);
    } catch (dirError) {
      console.error(`[createMemo] ディレクトリ作成エラー:`, dirError);
      return {
        success: false,
        error: `ディレクトリ作成エラー: ${
          dirError instanceof Error ? dirError.message : String(dirError)
        }`,
      };
    }

    // ファイルの書き込み
    try {
      console.log(`[createMemo] ファイル書き込み開始: "${fsPath}"`);
      await fs.writeFile(fsPath, content, "utf-8");
      console.log(`[createMemo] ファイル書き込み成功: "${fsPath}"`);

      // キャッシュの更新
      try {
        revalidatePath("/[...path]", "page");
        revalidateTag("files");
        console.log(`[createMemo] キャッシュ更新成功`);
      } catch (cacheError) {
        console.warn(`[createMemo] キャッシュ更新失敗:`, cacheError);
        // キャッシュ更新の失敗は無視して続行
      }

      return {
        success: true,
        data: { path: filePath },
      };
    } catch (writeError) {
      console.error(`[createMemo] ファイル書き込みエラー:`, writeError);
      return {
        success: false,
        error: `ファイル書き込みエラー: ${
          writeError instanceof Error ? writeError.message : String(writeError)
        }`,
      };
    }
  } catch (error) {
    console.error(`[createMemo] 予期せぬエラー:`, error);
    return {
      success: false,
      error: `メモ作成エラー: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
