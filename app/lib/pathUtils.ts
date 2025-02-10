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

  // デコードして正規化
  const decodedPath = decodeURIComponent(inputPath);
  const cleanPath = cleanPathForComparison(decodedPath);

  // デフォルトパスの場合はデフォルトパスを返す
  if (isDefaultPath(cleanPath)) {
    return normalizeDefaultPath();
  }

  // パスセパレータを正規化
  return cleanPath.split(/[/\\]/).join(path.sep);
}

/**
 * パスをファイルシステム用に変換します
 */
export function toFsPath(inputPath: string): string {
  const normalizedPath = normalizePath(inputPath);
  const absolutePath = normalizedPath.startsWith("/")
    ? normalizedPath
    : `/${normalizedPath}`;
  return decodeURIComponent(absolutePath);
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
  currentPath: string;
  basePath: string;
} {
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
      return {
        currentPath: cleanPath + "/",
        basePath: cleanPath,
      };
    }
    case "file": {
      const cleanPath = cleanPathForComparison(normalizedPath);
      const basePath = cleanPath.substring(0, cleanPath.lastIndexOf("/") + 1);
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
