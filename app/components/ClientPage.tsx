"use client";

import { useCallback, useEffect } from "react";
import { Toaster, toast } from "sonner";
import { saveFile, createFile, createFolder } from "./actions";
import { useRouter } from "next/navigation";
import { FolderPage } from "./FolderPage";
import path from "path";
import { FileNode } from "../types/file";
import { useTree } from "@/app/context/TreeContext";
import { useMemoActions } from "@/app/hooks/useMemoActions";

interface NewFileEvent extends CustomEvent {
  detail: { type: string };
}

interface CreateFolderEvent extends CustomEvent {
  detail: { parentPath: string };
}

interface ClientPageProps {
  initialTree: FileNode[];
  updateTree: () => Promise<FileNode[]>;
}

export function ClientPage({ initialTree, updateTree }: ClientPageProps) {
  const router = useRouter();
  const { currentPath, setCurrentPath } = useTree();
  const { createNewMemo } = useMemoActions();

  // イベントリスナーの設定
  useEffect(() => {
    const handlers = {
      newFile: (event: NewFileEvent) => {
        console.log("[ClientPage] New file event:", event.detail.type);
        createNewMemo({ askForFileName: false });
      },
      createFolder: async (event: CreateFolderEvent) => {
        const { parentPath } = event.detail;
        const folderName = window.prompt("フォルダ名を入力してください");
        if (!folderName) return;

        const result = await createFolder(parentPath, folderName);
        if (result.success) {
          window.dispatchEvent(new CustomEvent("createFolder"));
          const newFolderPath = path.join(parentPath, folderName);
          const normalizedPath = newFolderPath.endsWith("/")
            ? newFolderPath
            : newFolderPath + "/";

          setCurrentPath(normalizedPath);
          const encodedPath = normalizedPath
            .replace(/^\/+/, "")
            .split("/")
            .map((segment) => encodeURIComponent(segment))
            .join("/");

          router.push(`/${encodedPath}`);
          toast.success("フォルダを作成しました");
        } else {
          toast.error(result.error || "フォルダの作成に失敗しました");
        }
      },
      showToast: (
        event: CustomEvent<{ message: string; type: "success" | "error" }>
      ) => {
        const { message, type } = event.detail;
        if (type === "error") {
          toast.error(message);
        } else {
          toast.success(message);
        }
      },
    };

    // イベントリスナーの登録
    Object.entries(handlers).forEach(([event, handler]) => {
      window.addEventListener(event, handler as EventListener);
    });

    // クリーンアップ
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        window.removeEventListener(event, handler as EventListener);
      });
    };
  }, [createNewMemo, router, setCurrentPath]);

  return (
    <div className="container">
      <Toaster />
      <main className="main">
        <div className="split-view">
          <FolderPage
            folderPath={
              currentPath || process.env.NEXT_PUBLIC_DEFAULT_MD_PATH || ""
            }
            tree={initialTree}
            onUpdateTree={updateTree}
          />
        </div>
      </main>
      <style jsx>{`
        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .split-view {
          width: 100%;
          height: 100%;
          overflow: auto;
        }

        .quickmemo-page {
          padding: 2rem;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .quickmemo-page h1 {
          margin: 0;
          font-size: 1.8rem;
        }

        .description {
          margin: 0;
        }
      `}</style>
    </div>
  );
}
