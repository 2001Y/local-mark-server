import { Suspense } from "react";
import { SidebarWrapper } from "../components/SidebarWrapper";
import { TreeProvider } from "../context/TreeContext";
import { FileTreeServer } from "../components/FileTreeServer";

export default async function SidebarPage() {
  const { initialTree, updateTree } = await FileTreeServer();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TreeProvider initialTree={initialTree} updateTree={updateTree}>
        <SidebarWrapper />
      </TreeProvider>
    </Suspense>
  );
}
