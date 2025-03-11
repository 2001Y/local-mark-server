"use client";

import { Toaster } from "sonner";
import { MantineProvider, createTheme } from "@mantine/core";
import { SidebarProvider } from "../context/SidebarContext";
import { TreeProvider } from "../context/TreeContext";
import { EditorProvider } from "@/app/context/EditorContext";
import { ContextMenuProvider } from "../context/ContextMenuContext";
import { FileNode } from "../types/file";
import { useState, Component, ReactNode } from "react";

// 独自のErrorBoundaryコンポーネント
class ErrorBoundary extends Component<
  { children: ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] エラーが発生しました:", error, errorInfo);
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null; // エラー時はnullを返し、親コンポーネントでエラーUIを表示
    }
    return this.props.children;
  }
}

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
  console.log("[Providers] Rendering with initialTree:", initialTree?.length);

  // エラーハンドリングのためのエラー状態
  const [error, setError] = useState<Error | null>(null);

  // エラーが発生した場合のフォールバックUI
  if (error) {
    console.error("[Providers] エラーが発生しました:", error);
    return (
      <div style={{ padding: "20px", color: "red" }}>
        <h2>エラーが発生しました</h2>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>
          ページを再読み込み
        </button>
      </div>
    );
  }

  return (
    <>
      <Toaster />
      <MantineProvider
        theme={createTheme({
          primaryColor: "blue",
          fontFamily: "Inter, sans-serif",
        })}
      >
        <ErrorBoundary onError={(e: Error) => setError(e)}>
          <TreeProvider initialTree={initialTree} updateTree={updateTree}>
            <EditorProvider>
              <ContextMenuProvider>
                <SidebarProvider>{children}</SidebarProvider>
              </ContextMenuProvider>
            </EditorProvider>
          </TreeProvider>
        </ErrorBoundary>
      </MantineProvider>
    </>
  );
}
