import { FileTreeServer } from "@/app/components/FileTreeServer";
import { Suspense } from "react";
import { TreeProvider } from "@/app/context/TreeContext";
import { Header } from "@/app/components/Header";

export default async function DynamicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initialTree, updateTree } = await FileTreeServer();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TreeProvider initialTree={initialTree} updateTree={updateTree}>
        <Header source="dynamic-layout" />
        {children}
      </TreeProvider>
    </Suspense>
  );
}
