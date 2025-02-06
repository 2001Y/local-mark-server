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
  return (
    process.env.NEXT_PUBLIC_DEFAULT_MD_PATH?.replace(/^\/+/, "").replace(
      /\/*$/,
      ""
    ) || ""
  );
}

/**
 * パスからスラッシュを除去して比較用に正規化します
 */
export function cleanPathForComparison(path: string | undefined): string {
  if (!path) return "";
  return path.replace(/^\/+/, "").replace(/\/*$/, "");
}

/**
 * 指定されたパスがデフォルトパスかどうかを判定します
 */
export function isDefaultPath(path: string | undefined): boolean {
  if (!path) return true;
  const cleanedPath = cleanPathForComparison(path);
  const cleanedDefaultPath = cleanPathForComparison(
    process.env.NEXT_PUBLIC_DEFAULT_MD_PATH
  );
  return (
    cleanedPath === cleanedDefaultPath ||
    cleanedPath === "" ||
    cleanedPath === "/"
  );
}

/**
 * パスを正規化し、一貫した形式に変換します
 */
export function normalizePath(inputPath: string | undefined): string {
  if (!inputPath) {
    return normalizeDefaultPath();
  }

  // 先頭と末尾のスラッシュを除去
  const cleanPath = cleanPathForComparison(inputPath);

  // デフォルトパスの場合はデフォルトパスを返す
  if (isDefaultPath(cleanPath)) {
    return normalizeDefaultPath();
  }

  return cleanPath;
}

/**
 * パスの種類を判定します
 */
export function getPathType(
  path: string | string[]
): "root" | "file" | "directory" {
  if (Array.isArray(path)) {
    if (path.length === 0) return "root";
    return path[path.length - 1].includes(".") ? "file" : "directory";
  }
  if (path === "" || path === "/") return "root";
  return path.includes(".") ? "file" : "directory";
}

/**
 * 正規化されたパスからURLを生成します
 */
export function generateUrl(normalizedPath: string): string {
  const cleanPath = cleanPathForComparison(normalizedPath);

  // デフォルトパスの場合は / を返す
  if (isDefaultPath(cleanPath)) {
    return "/";
  }

  // パスをセグメントに分割してエンコード
  const encodedPath = cleanPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/${encodedPath}`;
}

/**
 * パスとその種類に基づいて、TreeContextの状態を更新するための値を生成します
 */
export function generateTreeState(inputPath: string): {
  basePath: string;
  currentPath: string;
} {
  const normalizedPath = normalizePath(inputPath);
  const pathType = getPathType(normalizedPath);

  switch (pathType) {
    case "root":
      return {
        basePath: normalizeDefaultPath() + "/",
        currentPath: normalizeDefaultPath() + "/",
      };
    case "directory": {
      const cleanPath = cleanPathForComparison(normalizedPath);
      return {
        basePath: cleanPath + "/",
        currentPath: cleanPath + "/",
      };
    }
    case "file": {
      const dirPath = path.dirname(normalizedPath);
      const cleanDirPath = cleanPathForComparison(dirPath);
      return {
        basePath: cleanDirPath + "/",
        currentPath: cleanPathForComparison(normalizedPath),
      };
    }
    default:
      return {
        basePath: normalizeDefaultPath() + "/",
        currentPath: normalizeDefaultPath() + "/",
      };
  }
}

/**
 * URLを更新します（再レンダリングを引き起こさない）
 */
// export function router.push(url: string): void {
//   if (typeof window === "undefined") return;

//   const newUrl = url.startsWith("http") ? new URL(url).pathname : url;
//   if (window.location.pathname !== newUrl) {
//     window.history.pushState({ url: newUrl }, "", newUrl);
//   }
// }
