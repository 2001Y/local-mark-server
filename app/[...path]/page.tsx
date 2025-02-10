import { Suspense } from "react";
import { getPathType } from "../lib/pathUtils";
import { PageClient } from "./PageClient";

interface PageProps {
  params: Promise<{
    path: string[];
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const pathSegments = resolvedParams.path;
  const pathType = getPathType(pathSegments);
  const fullPath = "/" + pathSegments.join("/");

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PageClient path={fullPath} isDirectory={pathType === "directory"} />
    </Suspense>
  );
}
