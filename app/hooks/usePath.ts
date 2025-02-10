"use client";

import { useSelectedLayoutSegments } from "next/navigation";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function usePath() {
  const segments = useSelectedLayoutSegments();
  const router = useRouter();

  const getCurrentPath = useCallback(() => {
    if (segments.length === 0) {
      return process.env.NEXT_PUBLIC_DEFAULT_MD_PATH + "/";
    }
    return "/" + segments.join("/");
  }, [segments]);

  const navigateTo = useCallback(
    (path: string) => {
      const cleanPath = path.replace(/^\/+/, "");
      const encodedPath = cleanPath
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
      router.push(`/${encodedPath}`);
    },
    [router]
  );

  const navigateToParent = useCallback(() => {
    if (segments.length <= 1) {
      return;
    }
    const parentSegments = segments.slice(0, -1);
    router.push("/" + parentSegments.join("/"), { scroll: false });
  }, [segments, router]);

  return {
    segments,
    getCurrentPath,
    navigateTo,
    navigateToParent,
    isRoot: segments.length === 0,
  };
}
