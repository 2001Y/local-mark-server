import { Suspense } from "react";
import { SidebarWrapper } from "../components/SidebarWrapper";

export default async function SidebarPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SidebarWrapper />
    </Suspense>
  );
}
