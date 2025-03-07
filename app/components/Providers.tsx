"use client";

import { Toaster } from "sonner";
import { MantineProvider, createTheme } from "@mantine/core";
import { SidebarProvider } from "../context/SidebarContext";
import { TreeProvider } from "../context/TreeContext";
import { EditorProvider } from "../context/EditorContext";
import { ContextMenuProvider } from "../context/ContextMenuContext";
import { FileNode } from "../types/file";

interface ProvidersProps {
  children: React.ReactNode;
  initialTree?: FileNode[];
  updateTree?: () => Promise<FileNode[]>;
}

// デフォルトの空の配列と関数
const defaultTree: FileNode[] = [];
const defaultUpdateTree = async (): Promise<FileNode[]> => [];

export function Providers({
  children,
  initialTree = defaultTree,
  updateTree = defaultUpdateTree,
}: ProvidersProps) {
  return (
    <>
      <Toaster />
      <MantineProvider
        theme={createTheme({
          primaryColor: "blue",
          fontFamily: "Inter, sans-serif",
        })}
      >
        <TreeProvider initialTree={initialTree} updateTree={updateTree}>
          <EditorProvider>
            <ContextMenuProvider>
              <SidebarProvider>{children}</SidebarProvider>
            </ContextMenuProvider>
          </EditorProvider>
        </TreeProvider>
      </MantineProvider>
    </>
  );
}
