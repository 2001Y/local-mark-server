import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { getFileContent } from "../actions/server";
import { FolderPage } from "../components/FolderPage";
import { FileEditor } from "./FileEditor";
import { getPathType } from "../lib/pathUtils";
import { PageClient } from "./PageClient";

interface PageProps {
  params: {
    path: string[];
  };
}

export default async function Page({ params }: PageProps) {
  noStore();

  // paramsを非同期で扱う
  const resolvedParams = await Promise.resolve(params);
  const pathSegments = resolvedParams.path;
  const pathType = getPathType(pathSegments);
  const fullPath = "/" + pathSegments.join("/");

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PageClient path={fullPath} isDirectory={pathType === "directory"} />
    </Suspense>
  );
}
