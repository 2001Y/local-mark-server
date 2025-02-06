"use client";

import { Icon } from "@iconify/react";
import { useCallback } from "react";
import { createFile, saveFile } from "../components/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTree } from "@/app/context/TreeContext";
import styles from "./quickmemo.module.css";

const generateUniqueFileName = () => {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0];
  const [hours, minutes] = time.split(":");
  return `${date}_${hours}_${minutes}`;
};

export function SaveButton() {
  const router = useRouter();
  const { setBasePath, setCurrentPath } = useTree();

  const handleSave = useCallback(async () => {
    try {
      const content = localStorage.getItem("unsaved_content") || "";
      const defaultFileName = generateUniqueFileName();
      const userFileName = window.prompt(
        "ファイル名を入力してください（.mdは自動で付加されます）",
        defaultFileName
      );

      if (!userFileName) return;

      const fileName = userFileName.trim() || defaultFileName;
      const newPath = `${process.env.NEXT_PUBLIC_DEFAULT_MD_PATH}/${fileName}.md`;

      const result = await createFile(
        process.env.NEXT_PUBLIC_DEFAULT_MD_PATH!,
        `${fileName}.md`
      );

      if (!result.success) {
        toast.error(result.error || "ファイルの作成に失敗しました");
        return;
      }

      const saveResult = await saveFile(newPath, content);
      if (!saveResult.success) {
        toast.error(saveResult.error || "ファイルの保存に失敗しました");
        return;
      }

      localStorage.removeItem("unsaved_content");
      toast.success("ファイルを保存しました");

      // ファイルページに遷移
      const cleanPath = newPath.replace(/^\/+/, "");
      const encodedPath = cleanPath
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");

      setCurrentPath(newPath);
      router.push(`/${encodedPath}`);
    } catch (error) {
      console.error("Error saving file:", error);
      toast.error("ファイルの保存に失敗しました");
    }
  }, [router, setBasePath, setCurrentPath]);

  return (
    <button onClick={handleSave} className={styles["save-button"]}>
      <Icon icon="ph:floppy-disk" width={20} height={20} />
      <span>保存</span>
    </button>
  );
}
