import { Suspense } from "react";
import { FileTreeServer } from "../components/FileTreeServer";
import { SidebarWrapper } from "../components/SidebarWrapper";

export default async function SidebarPage() {
  const { initialTree, updateTree } = await FileTreeServer();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SidebarWrapper tree={initialTree} onUpdateTree={updateTree} />
    </Suspense>
  );
}
