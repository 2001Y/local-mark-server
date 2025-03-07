import * as fs from "fs/promises";
import { normalizePath } from "./pathUtils";
import * as path from "path";

export async function ensureDefaultDirectory() {
  const defaultPath = process.env.NEXT_PUBLIC_DEFAULT_MD_PATH;
  console.log(`[ensureDefaultDirectory] デフォルトパス: "${defaultPath}"`);

  if (!defaultPath) {
    console.error("NEXT_PUBLIC_DEFAULT_MD_PATH is not set");
    return false;
  }

  // 絶対パスをそのまま使用
  let pathToUse = defaultPath;

  // 絶対パスでない場合は、相対パスとして処理
  if (!path.isAbsolute(defaultPath)) {
    pathToUse = normalizePath(defaultPath);
  }

  console.log(`[ensureDefaultDirectory] 使用するパス: "${pathToUse}"`);

  try {
    await fs.access(pathToUse);
    const stats = await fs.stat(pathToUse);
    if (!stats.isDirectory()) {
      console.error(
        "NEXT_PUBLIC_DEFAULT_MD_PATH exists but is not a directory"
      );
      return false;
    }
    console.log(
      `[ensureDefaultDirectory] ディレクトリは既に存在します: "${pathToUse}"`
    );
    return true;
  } catch {
    // ディレクトリが存在しない場合は作成
    console.log(
      `[ensureDefaultDirectory] ディレクトリを作成します: "${pathToUse}"`
    );
    try {
      await fs.mkdir(pathToUse, { recursive: true });
      console.log(
        `[ensureDefaultDirectory] ディレクトリ作成成功: "${pathToUse}"`
      );
      return true;
    } catch (error) {
      console.error(
        `[ensureDefaultDirectory] ディレクトリ作成失敗: "${pathToUse}"`,
        error
      );
      return false;
    }
  }
}

export async function ensureDirectoryExists(dirPath: string): Promise<boolean> {
  try {
    // 絶対パスをそのまま使用
    let pathToUse = dirPath;

    // 絶対パスでない場合は、相対パスとして処理
    if (!path.isAbsolute(dirPath)) {
      pathToUse = normalizePath(dirPath);
    }

    await fs.access(pathToUse);
    const stats = await fs.stat(pathToUse);
    if (stats.isDirectory()) {
      return true;
    }
    console.error(`Path exists but is not a directory: ${dirPath}`);
    return false;
  } catch {
    try {
      // 絶対パスをそのまま使用
      let pathToUse = dirPath;

      // 絶対パスでない場合は、相対パスとして処理
      if (!path.isAbsolute(dirPath)) {
        pathToUse = normalizePath(dirPath);
      }

      await fs.mkdir(pathToUse, { recursive: true });
      return true;
    } catch (error) {
      console.error(`Failed to create directory: ${dirPath}`, error);
      return false;
    }
  }
}
