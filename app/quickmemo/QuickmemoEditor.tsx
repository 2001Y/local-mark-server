"use client";

import { DynamicEditor } from "@/components/editor/DynamicEditor";
import { useCallback, useState } from "react";
import { Icon } from "@iconify/react";
import { useAppPath } from "@/app/hooks/useAppPath";
import { toast } from "sonner";
import styles from "./quickmemo.module.css";
import { useFileActions } from "@/app/actions/client";

export function QuickmemoEditor() {
  const { navigateToFile } = useAppPath();
  const { handleNewFile } = useFileActions();
  const [content, setContent] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("unsaved_content") || "";
  });

  const handleSave = useCallback((newContent: string) => {
    try {
      localStorage.setItem("unsaved_content", newContent);
      setContent(newContent);
    } catch (error) {
      console.error("Failed to save content:", error);
      toast.error("Failed to save changes");
    }
  }, []);

  const handleSaveToFile = useCallback(async () => {
    try {
      const result = await handleNewFile(content, true);
      if (result?.path) {
        localStorage.removeItem("unsaved_content");
        navigateToFile(result.path);
      }
    } catch (error) {
      console.error("Error saving file:", error);
      toast.error("ファイルの保存に失敗しました");
    }
  }, [content, handleNewFile, navigateToFile]);

  return (
    <div className={styles["editor-wrapper"]}>
      <div className={styles["editor-toolbar"]}>
        <button onClick={handleSaveToFile} className={styles["save-button"]}>
          <Icon icon="ph:floppy-disk" width={20} height={20} />
          <span>保存</span>
        </button>
      </div>
      <DynamicEditor
        initialContent={content}
        onSave={handleSave}
        autoSave={true}
      />
    </div>
  );
}
