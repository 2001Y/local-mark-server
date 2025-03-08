import path from "path";
import os from "os";

export const appPaths = {
  root: "/",
  quickmemo: "/quickmemo",
  defaultMdPath: process.env.NEXT_PUBLIC_DEFAULT_MD_PATH || "/content",
} as const;

export function getUserNameFromPath(filePath: string): string {
  // パスからユーザー名を抽出
  const parts = filePath.split(path.sep);
  const userIndex = parts.findIndex((part) => part === "home") + 1;
  if (userIndex > 0 && userIndex < parts.length) {
    return parts[userIndex];
  }
  return "Guest";
}

/**
 * デフォルトパスを正規化します
 */
export function normalizeDefaultPath(): string {
  // 末尾のスラッシュを付けない形で正規化
  const defaultPath = process.env.NEXT_PUBLIC_DEFAULT_MD_PATH || "";
  console.log(`[normalizeDefaultPath] 元のデフォルトパス: "${defaultPath}"`);

  // 絶対パスの場合は先頭の/を保持
  if (defaultPath.startsWith("/")) {
    const normalized = defaultPath.replace(/\/*$/, "");
    console.log(`[normalizeDefaultPath] 絶対パスとして正規化: "${normalized}"`);
    return normalized;
  }

  // 相対パスの場合
  const normalized = defaultPath.replace(/^\/+/, "").replace(/\/*$/, "");
  console.log(`[normalizeDefaultPath] 相対パスとして正規化: "${normalized}"`);
  return normalized;
}

/**
 * パスからスラッシュを除去して比較用に正規化します
 */
export function cleanPathForComparison(path: string | undefined): string {
  console.log(`[cleanPathForComparison] 入力パス: "${path}"`);
  if (!path) return "";

  // 絶対パスの場合は先頭の/を保持する
  if (path.startsWith("/")) {
    // 先頭の/は保持し、末尾の/のみ削除
    const cleaned = path.replace(/\/*$/, "");
    console.log(`[cleanPathForComparison] 絶対パスとして処理: "${cleaned}"`);
    return cleaned;
  }

  // 相対パスの場合は従来通り処理
  const cleaned = path.replace(/^\/+/, "").replace(/\/*$/, "");
  console.log(`[cleanPathForComparison] 相対パスとして処理: "${cleaned}"`);
  return cleaned;
}

/**
 * 指定されたパスがデフォルトパスかどうかを判定します
 */
export function isDefaultPath(path: string | undefined): boolean {
  console.log(`[isDefaultPath] 入力パス: "${path}"`);
  if (!path) return true;

  const defaultPath = process.env.NEXT_PUBLIC_DEFAULT_MD_PATH;
  if (!defaultPath) return false;

  // 両方のパスが絶対パスの場合は、そのまま比較
  if (path.startsWith("/") && defaultPath.startsWith("/")) {
    const cleanedPath = path.replace(/\/*$/, "");
    const cleanedDefaultPath = defaultPath.replace(/\/*$/, "");
    const result = cleanedPath === cleanedDefaultPath;
    console.log(
      `[isDefaultPath] 絶対パスとして比較: "${cleanedPath}" === "${cleanedDefaultPath}" => ${result}`
    );
    return result;
  }

  // 通常の比較（相対パスとして）
  const cleanedPath = cleanPathForComparison(path);
  const cleanedDefaultPath = cleanPathForComparison(defaultPath);
  const result = cleanedPath === cleanedDefaultPath;
  console.log(
    `[isDefaultPath] 相対パスとして比較: "${cleanedPath}" === "${cleanedDefaultPath}" => ${result}`
  );
  return result;
}

/**
 * パスを正規化し、一貫した形式に変換します
 */
export function normalizePath(inputPath: string | undefined): string {
  console.log(`[normalizePath] 入力パス: "${inputPath}"`);

  if (!inputPath) {
    const defaultPath = normalizeDefaultPath();
    console.log(
      `[normalizePath] 入力パスなし、デフォルトパスを使用: "${defaultPath}"`
    );
    return defaultPath;
  }

  // デコードして正規化
  const decodedPath = decodeURIComponent(inputPath);
  console.log(`[normalizePath] デコード後: "${decodedPath}"`);

  // 重複スラッシュを削除
  const withoutDuplicateSlashes = decodedPath.replace(/\/+/g, "/");
  console.log(
    `[normalizePath] 重複スラッシュ削除後: "${withoutDuplicateSlashes}"`
  );

  const cleanPath = cleanPathForComparison(withoutDuplicateSlashes);
  console.log(`[normalizePath] クリーン後: "${cleanPath}"`);

  // デフォルトパスの場合はデフォルトパスを返す
  if (isDefaultPath(cleanPath)) {
    // 絶対パスを保持するためにprocess.env.NEXT_PUBLIC_DEFAULT_MD_PATHをそのまま使用せず
    // normalizeDefaultPath()を使用する
    const defaultPath = normalizeDefaultPath();
    console.log(`[normalizePath] デフォルトパスと判定: "${defaultPath}"`);
    return defaultPath;
  }

  // 空のパスの場合はデフォルトパスを返す
  if (cleanPath === "") {
    const defaultPath = normalizeDefaultPath();
    console.log(`[normalizePath] 空パスと判定: "${defaultPath}"`);
    return defaultPath;
  }

  // 絶対パスの場合は先頭の/を保持
  if (withoutDuplicateSlashes.startsWith("/")) {
    // パスセパレータを正規化
    const normalizedPath = cleanPath.split(/[/\\]/).join(path.sep);
    // 先頭に/を追加（重複しないように）
    const absolutePath = path.sep + normalizedPath.replace(/^\/+/, "");
    console.log(`[normalizePath] 絶対パスとして正規化: "${absolutePath}"`);
    return absolutePath;
  }

  // 相対パスの場合
  const normalizedPath = cleanPath.split(/[/\\]/).join(path.sep);
  console.log(`[normalizePath] 相対パスとして正規化: "${normalizedPath}"`);
  return normalizedPath;
}

/**
 * パスをファイルシステム用に変換します
 */
export function toFsPath(inputPath: string): string {
  const basePath = process.env.NEXT_PUBLIC_DEFAULT_MD_PATH;
  if (!basePath) {
    console.error("[toFsPath] NEXT_PUBLIC_DEFAULT_MD_PATH is not set");
    throw new Error("NEXT_PUBLIC_DEFAULT_MD_PATH is not set");
  }

  console.log(`[toFsPath] 入力パス: "${inputPath}", ベースパス: "${basePath}"`);

  // 追加デバッグログ - 入力パスの詳細
  console.log(`[toFsPath] 入力パスの詳細:`, {
    originalPath: inputPath,
    isAbsolute: inputPath.startsWith("/"),
    pathComponents: inputPath.split("/"),
    containsJapanese:
      /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(
        inputPath
      ),
    envDefaultPath: process.env.NEXT_PUBLIC_DEFAULT_MD_PATH,
  });

  // 入力パスがnullまたは空の場合はベースパスを返す
  if (!inputPath) {
    console.log(`[toFsPath] 入力パスが空のためベースパスを返す: "${basePath}"`);
    return basePath;
  }

  try {
    // 重複スラッシュを削除
    const cleanedInputPath = inputPath.replace(/\/+/g, "/");
    console.log(`[toFsPath] 重複スラッシュ削除後: "${cleanedInputPath}"`);

    // 入力パスが絶対パスの場合は正規化せずにそのまま返す
    if (path.isAbsolute(cleanedInputPath)) {
      const decodedPath = decodeURIComponent(cleanedInputPath);
      console.log(
        `[toFsPath] 入力が絶対パスのためそのまま返す: "${decodedPath}"`
      );
      return decodedPath;
    }

    const normalizedPath = normalizePath(cleanedInputPath);
    console.log(`[toFsPath] 正規化後のパス: "${normalizedPath}"`);

    // 正規化後のパスが絶対パスの場合はそのまま返す
    if (path.isAbsolute(normalizedPath)) {
      const decodedPath = decodeURIComponent(normalizedPath);
      console.log(`[toFsPath] 正規化後が絶対パスのため返す: "${decodedPath}"`);
      return decodedPath;
    }

    // ベースパスと結合
    const resultPath = path.join(basePath, normalizedPath);
    console.log(`[toFsPath] 結合後のパス: "${resultPath}"`);
    return resultPath;
  } catch (error) {
    console.error(`[toFsPath] パス変換エラー:`, error);
    console.error(`[toFsPath] エラーの詳細:`, {
      inputPath,
      basePath,
      errorType: error instanceof Error ? "Error" : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      `パス変換エラー: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * パスをURL用に変換します
 */
export function toUrlPath(inputPath: string): string {
  const normalizedPath = normalizePath(inputPath);
  return normalizedPath
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/**
 * パスの種類を判定します
 */
export function getPathType(
  path: string | string[] | undefined
): "root" | "file" | "directory" {
  console.log(`[getPathType] 入力パス: "${path}"`);

  if (!path) return "root";

  if (Array.isArray(path)) {
    if (path.length === 0) return "root";
    const lastSegment = path[path.length - 1];
    if (!lastSegment) return "directory";
    return lastSegment.includes(".") ? "file" : "directory";
  }

  if (path === "" || path === "/") return "root";
  return path.includes(".") ? "file" : "directory";
}

/**
 * 正規化されたパスからURLを生成します
 * @param normalizedPath 正規化されたパス
 * @returns URLパス
 */
export function generateUrl(normalizedPath: string): string {
  console.log(`[generateUrl] 入力パス: "${normalizedPath}"`);

  // 空のパスやundefinedの場合はルートを返す
  if (!normalizedPath) {
    console.log(`[generateUrl] 空のパス、ルートを返します`);
    return "/";
  }

  // パスを正規化
  const cleanPath = cleanPathForComparison(normalizedPath);
  console.log(`[generateUrl] クリーン後: "${cleanPath}"`);

  // デフォルトパスの場合は / を返す
  if (isDefaultPath(cleanPath)) {
    console.log(`[generateUrl] デフォルトパスと判定、ルートを返します`);
    return "/";
  }

  // パスをセグメントに分割してエンコード
  const segments = cleanPath.split("/").filter(Boolean);
  console.log(`[generateUrl] セグメント:`, segments);

  const encodedPath = segments
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  console.log(`[generateUrl] エンコード後: "${encodedPath}"`);
  return `/${encodedPath}`;
}

/**
 * パスとその種類に基づいて、TreeContextの状態を更新するための値を生成します
 */
export function generateTreeState(inputPath: string): {
  currentPath: string;
  basePath: string;
} {
  console.log(`[generateTreeState] 入力パス: "${inputPath}"`);

  if (!inputPath || inputPath === "") {
    const defaultPath = normalizeDefaultPath();
    console.log(`[generateTreeState] 空パス、デフォルト使用: "${defaultPath}"`);
    return {
      currentPath: defaultPath + "/",
      basePath: defaultPath,
    };
  }

  const normalizedPath = normalizePath(inputPath);
  const pathType = getPathType(normalizedPath);
  const defaultPath = normalizeDefaultPath();

  switch (pathType) {
    case "root":
      return {
        currentPath: defaultPath + "/",
        basePath: defaultPath,
      };
    case "directory": {
      const cleanPath = cleanPathForComparison(normalizedPath);
      if (!cleanPath || cleanPath === "") {
        return {
          currentPath: defaultPath + "/",
          basePath: defaultPath,
        };
      }
      return {
        currentPath: cleanPath + "/",
        basePath: cleanPath,
      };
    }
    case "file": {
      const cleanPath = cleanPathForComparison(normalizedPath);
      if (!cleanPath || cleanPath === "") {
        return {
          currentPath: defaultPath + "/",
          basePath: defaultPath,
        };
      }
      const lastSlashIndex = cleanPath.lastIndexOf("/");
      const basePath =
        lastSlashIndex >= 0
          ? cleanPath.substring(0, lastSlashIndex + 1)
          : defaultPath;
      return {
        currentPath: cleanPath,
        basePath: basePath || defaultPath,
      };
    }
    default:
      return {
        currentPath: defaultPath + "/",
        basePath: defaultPath,
      };
  }
}

/**
 * URLを更新します（再レンダリングを引き起こさない）
 */
export function updateUrl(url: string): void {
  if (typeof window === "undefined") return;

  const newUrl = url.startsWith("http") ? new URL(url).pathname : url;
  if (window.location.pathname !== newUrl) {
    window.history.pushState({ url: newUrl }, "", newUrl);
  }
}
