"use client";

import { toast } from "sonner";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { generateUniqueFileName } from "../lib/fileUtils";
import * as serverActions from "./server";
import { useAppPath } from "@/app/hooks/useAppPath";

export function useFileActions() {
  const { navigateToFile, appPaths } = useAppPath();

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

        if (!appPaths.defaultMdPath) {
          console.error("Default MD path is not set");
          toast.error("保存先のパスが設定されていません");
          return { success: false };
        }

        const newPath = `${appPaths.defaultMdPath}/${fileName}.md`;
        console.log("Saving file to:", newPath);

        const saveResult = await serverActions.saveFile(
          newPath,
          initialContent || ""
        );

        if (!saveResult.success) {
          console.error("File save failed:", saveResult.error);
          toast.error(saveResult.error || "ファイルの保存に失敗しました");
          return { success: false };
        }

        toast.success("ファイルを保存しました");
        return { success: true, path: newPath };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "不明なエラーが発生しました";
        console.error("Error saving new file:", error);
        toast.error(`ファイルの保存に失敗しました: ${errorMessage}`);
        return { success: false };
      }
    },
    [appPaths]
  );

  const handleNewFolder = useCallback(
    async (parentPath: string) => {
      try {
        const folderName = window.prompt("フォルダ名を入力してください");
        if (!folderName) return;

        const result = await serverActions.createFolder(parentPath, folderName);
        if (result.success) {
          const newFolderPath = `${parentPath}/${folderName}`;
          const cleanPath = newFolderPath.replace(/^\/+/, "");
          const encodedPath = cleanPath
            .split("/")
            .map((segment) => encodeURIComponent(segment))
            .join("/");

          navigateToFile(encodedPath);
          toast.success("フォルダを作成しました");
        } else {
          toast.error(result.error || "フォルダの作成に失敗しました");
        }
      } catch (error) {
        console.error("Error creating folder:", error);
        toast.error("フォルダの作成に失敗しました");
      }
    },
    [navigateToFile]
  );

  const handleDelete = useCallback(
    async (path: string, type: "file" | "directory") => {
      try {
        const result = await serverActions.deleteItem(path, type);
        if (result.success) {
          toast.success(
            `${type === "file" ? "ファイル" : "フォルダ"}を削除しました`
          );
          navigateToFile(path);
        } else {
          toast.error(result.error || "削除に失敗しました");
        }
      } catch (error) {
        console.error("Error deleting item:", error);
        toast.error("削除に失敗しました");
      }
    },
    [navigateToFile]
  );

  const handleRename = useCallback(
    async (oldPath: string, newName: string, type: "file" | "directory") => {
      try {
        const result = await serverActions.renameItem(oldPath, newName, type);
        if (result.success) {
          toast.success("名前を変更しました");
          navigateToFile(oldPath);
        } else {
          toast.error(result.error || "名前の変更に失敗しました");
        }
      } catch (error) {
        console.error("Error renaming item:", error);
        toast.error("名前の変更に失敗しました");
      }
    },
    [navigateToFile]
  );

  return {
    handleNewFile,
    handleNewFolder,
    handleDelete,
    handleRename,
  };
}

export const saveToLocalStorage = (content: string) => {
  try {
    localStorage.setItem("unsaved_content", content);
    return { success: true };
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
    return { success: false, error: "Failed to save to localStorage" };
  }
};

export const getFromLocalStorage = () => {
  try {
    return {
      success: true,
      content: localStorage.getItem("unsaved_content") || "",
    };
  } catch (error) {
    console.error("Failed to get from localStorage:", error);
    return { success: false, error: "Failed to get from localStorage" };
  }
};

export const clearLocalStorage = () => {
  try {
    localStorage.removeItem("unsaved_content");
    return { success: true };
  } catch (error) {
    console.error("Failed to clear localStorage:", error);
    return { success: false, error: "Failed to clear localStorage" };
  }
};
