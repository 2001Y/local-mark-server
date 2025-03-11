"use client";

import { useCallback, useEffect } from "react";
import { Toaster, toast } from "sonner";
import { saveFile, createFile, createFolder } from "./actions";
import { useRouter } from "next/navigation";
import { FolderPage } from "./FolderPage";
import path from "path";
import { FileNode } from "../types/file";
import { useTree } from "@/app/context/TreeContext";

interface NewFileEvent extends CustomEvent {
  detail: { type: string };
}

interface CreateFolderEvent extends CustomEvent {
  detail: { parentPath: string };
}

const generateUniqueFileName = () => {
  const now = new Date();
  const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const time = now.toTimeString().split(" ")[0]; // HH:MM:SS
  const [hours, minutes, seconds] = time.split(":");

  // 同じ名前のファイルが存在する場合のために連番を用意
  // 実際の連番の処理はサーバーサイドで行う
  return `${date}_${hours}_${minutes}`; // 基本形式
  // 必要に応じて秒と連番が追加される: ${date}_${hours}_${minutes}_${seconds}_1
};

interface ClientPageProps {
  initialTree: FileNode[];
  updateTree: () => Promise<FileNode[]>;
}

export function ClientPage({ initialTree, updateTree }: ClientPageProps) {
  const router = useRouter();
  const { currentPath, setCurrentPath } = useTree();

  const handleNewFile = useCallback(
    async (initialContent?: string, askName: boolean = false) => {
      try {
        let fileName = generateUniqueFileName();

        if (askName) {
          const defaultFileName = fileName;
          const userFileName = window.prompt(
            "ファイル名を入力してください（.mdは自動で付加されます）",
            defaultFileName
          );
          if (userFileName === null) return;
          fileName = userFileName.trim() || defaultFileName;
        }

        const newPath = `${process.env.NEXT_PUBLIC_DEFAULT_MD_PATH}/${fileName}.md`;

        const result = await createFile(
          process.env.NEXT_PUBLIC_DEFAULT_MD_PATH!,
          fileName
        );
        if (!result.success) {
          toast.error(result.error || "ファイルの作成に失敗しました");
          return;
        }

        if (initialContent) {
          const saveResult = await saveFile(newPath, initialContent);
          if (!saveResult.success) {
            toast.error(saveResult.error || "ファイルの保存に失敗しました");
            return;
          }
          localStorage.removeItem("unsaved_content");
        }

        window.dispatchEvent(new CustomEvent("createFile"));

        // パスの先頭のスラッシュを削除
        const cleanPath = newPath.replace(/^\/+/, "");
        // パスをエンコード
        const encodedPath = cleanPath
          .split("/")
          .map((segment) => encodeURIComponent(segment))
          .join("/");

        setCurrentPath(newPath);
        router.push(`/${encodedPath}`);

        toast.success("新規ファイルを作成しました");
      } catch (error) {
        console.error("Error creating new file:", error);
        toast.error("ファイルの作成に失敗しました");
      }
    },
    [router, setCurrentPath]
  );

  // イベントリスナーの設定
  useEffect(() => {
    const handlers = {
      newFile: (event: NewFileEvent) => {
        console.log("[ClientPage] New file event:", event.detail.type);
        handleNewFile();
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
  }, [handleNewFile, router, setCurrentPath]);

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
