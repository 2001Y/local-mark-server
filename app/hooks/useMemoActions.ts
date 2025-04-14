"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createMemo } from "../actions/memoActions";
import { appPaths } from "../lib/pathUtils";
import { useTree } from "../context/TreeContext";

interface MemoOptions {
  fileName?: string;
  content?: string;
  parentPath?: string;
  navigateAfterCreate?: boolean;
  askForFileName?: boolean;
}

/**
 * メモ操作のためのカスタムフック
 * クライアントコンポーネントで利用可能
 */
export function useMemoActions() {
  const router = useRouter();
  const { setCurrentPath } = useTree();
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * 新規メモを作成する関数
   */
  const createNewMemo = useCallback(
    async ({
      fileName,
      content = "",
      parentPath = appPaths.defaultMdPath,
      navigateAfterCreate = true,
      askForFileName = false,
    }: MemoOptions) => {
      setIsProcessing(true);
      try {
        let finalFileName = fileName;

        // ファイル名の入力ダイアログを表示（要求された場合）
        if (askForFileName) {
          const defaultFileName = finalFileName || "";
          const userFileName = window.prompt(
            "ファイル名を入力してください（.mdは自動で付加されます）",
            defaultFileName
          );

          // キャンセルされた場合
          if (userFileName === null) {
            setIsProcessing(false);
            return { success: false, cancelled: true };
          }

          finalFileName = userFileName.trim() || defaultFileName;
        }

        // サーバーアクションを呼び出し
        const result = await createMemo({
          fileName: finalFileName,
          content,
          parentPath,
          useTimestamp: !finalFileName, // ファイル名がない場合はタイムスタンプを使用
        });

        if (!result.success) {
          toast.error(result.error || "メモの作成に失敗しました");
          return { success: false };
        }

        toast.success("新規メモを作成しました");

        // 作成後にそのメモに移動（オプション）
        if (navigateAfterCreate && result.data?.path) {
          const newPath = result.data.path;
          // ツリーコンテキストの更新
          setCurrentPath(newPath);

          // パスの先頭のスラッシュを削除
          const cleanPath = newPath.replace(/^\/+/, "");
          // パスをエンコード
          const encodedPath = cleanPath
            .split("/")
            .map((segment) => encodeURIComponent(segment))
            .join("/");

          // 新しいメモに移動
          router.push(`/${encodedPath}`);
        }

        // ローカルストレージのクリア（一時保存があれば）
        if (content) {
          try {
            localStorage.removeItem("unsaved_content");
          } catch (e) {
            console.warn("Failed to clear localStorage", e);
          }
        }

        return { success: true, path: result.data?.path };
      } catch (error) {
        console.error("Error creating memo:", error);
        const errorMessage =
          error instanceof Error ? error.message : "不明なエラーが発生しました";
        toast.error(`メモの作成に失敗しました: ${errorMessage}`);
        return { success: false };
      } finally {
        setIsProcessing(false);
      }
    },
    [router, setCurrentPath]
  );

  /**
   * クイックメモを作成する関数
   * クイックメモページに移動する
   */
  const navigateToQuickmemo = useCallback(() => {
    router.push(appPaths.quickmemo);
  }, [router]);

  /**
   * 一時保存された内容を新規メモとして保存する関数
   */
  const saveUnsavedContentAsNewMemo = useCallback(
    async (askForFileName = true) => {
      try {
        // ローカルストレージから取得
        const unsavedContent = localStorage.getItem("unsaved_content");

        if (!unsavedContent) {
          toast.error("保存する内容がありません");
          return { success: false };
        }

        // 新規メモとして保存
        return await createNewMemo({
          content: unsavedContent,
          askForFileName,
        });
      } catch (error) {
        console.error("Error saving unsaved content:", error);
        toast.error("一時保存内容の保存に失敗しました");
        return { success: false };
      }
    },
    [createNewMemo]
  );

  return {
    createNewMemo,
    navigateToQuickmemo,
    saveUnsavedContentAsNewMemo,
    isProcessing,
  };
}
