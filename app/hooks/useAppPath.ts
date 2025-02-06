"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useTree } from "@/app/context/TreeContext";
import {
  normalizePath,
  generateTreeState,
  appPaths,
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

      // setBasePath(basePath);
      setCurrentPath(currentPath);
      router.push(path);
    },
    [router, setBasePath, setCurrentPath]
  );

  const navigateToFile = useCallback(
    (filePath: string) => {
      const cleanPath = filePath.replace(/^\/+/, "");
      const encodedPath = cleanPath
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");

      navigateTo(`/${encodedPath}`);
    },
    [navigateTo]
  );

  return {
    navigateTo,
    navigateToFile,
    appPaths,
  };
}
