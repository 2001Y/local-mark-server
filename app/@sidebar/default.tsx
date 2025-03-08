import { Suspense } from "react";
import { SidebarWrapper } from "../components/SidebarWrapper";
import { TreeProvider } from "../context/TreeContext";
import { FileTreeServer } from "../components/FileTreeServer";
import { ErrorBoundary } from "../components/ErrorBoundary";

export default async function SidebarPage() {
  const { initialTree, updateTree } = await FileTreeServer();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorBoundary errorMessage="サイドバーの表示中にエラーが発生しました">
        <TreeProvider initialTree={initialTree} updateTree={updateTree}>
          <SidebarWrapper />
        </TreeProvider>
      </ErrorBoundary>
    </Suspense>
  );
}
