import { Suspense } from "react";
import { SidebarWrapper } from "../components/SidebarWrapper";
import { ContextMenuProvider } from "../context/ContextMenuContext";

export default async function SidebarPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ContextMenuProvider>
        <SidebarWrapper />
      </ContextMenuProvider>
    </Suspense>
  );
}
