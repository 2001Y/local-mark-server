"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useTree } from "@/app/context/TreeContext";
import {
  normalizePath,
  generateTreeState,
  appPaths,
  toUrlPath,
} from "@/app/lib/pathUtils";

/**
 * パスの状態を管理するためのカスタムフック
 */
export function useAppPath() {
  const router = useRouter();
  const { setBasePath, setCurrentPath } = useTree();

  const navigateTo = useCallback(
    (path: string) => {
      const normalizedPath = normalizePath(path);
      const { basePath, currentPath } = generateTreeState(normalizedPath);
      setBasePath(basePath);
      setCurrentPath(currentPath);

      // URLエンコードされたパスで遷移
      const urlPath = toUrlPath(path);
      router.push(urlPath);
    },
    [router, setBasePath, setCurrentPath]
  );

  const navigateToFile = useCallback(
    (filePath: string) => {
      const urlPath = toUrlPath(filePath);
      navigateTo(urlPath);
    },
    [navigateTo]
  );

  return {
    navigateTo,
    navigateToFile,
    appPaths,
  };
}
