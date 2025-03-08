"use client";

import { FileEditor } from "@/app/[...path]/FileEditor";
import { useCallback, useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { useAppPath } from "@/app/hooks/useAppPath";
import { toast } from "sonner";
import styles from "./quickmemo.module.css";
import { useFileActions } from "@/app/actions/client";
import { useEditor } from "@/app/context/EditorContext";
import { Block, BlockNoteEditor } from "@blocknote/core";

// クイックメモ用の一時ファイルパス
const QUICKMEMO_PATH = "quickmemo_temp";

export function QuickmemoEditor() {
  const { navigateToFile } = useAppPath();
  const { handleNewFile } = useFileActions();
  const { editor, setCachedBlocks } = useEditor();
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const contentRef = useRef<string>("");

  // エディタオブジェクトの状態をログに出力
  useEffect(() => {
    console.log("[QuickmemoEditor] Editor object:", editor);
    if (editor) {
      console.log("[QuickmemoEditor] Editor methods:", Object.keys(editor));
      console.log(
        "[QuickmemoEditor] Editor prototype:",
        Object.getPrototypeOf(editor)
      );
    }
  }, [editor]);

  // コンポーネントのマウント時にlocalStorageから内容を読み込む
  useEffect(() => {
    const savedContent = localStorage.getItem("unsaved_content") || "";
    setContent(savedContent);
    contentRef.current = savedContent;
    setIsLoading(false);
  }, []);

  // エディタの内容が変更されたときにlocalStorageに保存する
  useEffect(() => {
    if (!editor) return;

    const handleEditorUpdate = () => {
      try {
        // エディタの内容をMarkdown形式で取得
        if (!editor.topLevelBlocks) {
          console.error("[QuickmemoEditor] topLevelBlocksが存在しません");
          return;
        }

        const blocks = editor.topLevelBlocks;
        if (blocks.length === 0) return;

        // ブロックの内容をlocalStorageに保存
        const markdownContent = blocksToMarkdown(blocks);
        if (markdownContent !== contentRef.current) {
          localStorage.setItem("unsaved_content", markdownContent);
          contentRef.current = markdownContent;
          setContent(markdownContent);
          console.log("クイックメモの内容を保存しました");
        }
      } catch (error) {
        console.error("クイックメモの保存中にエラーが発生しました:", error);
      }
    };

    // エディタの変更を監視
    try {
      if (editor && typeof editor.onEditorContentChange === "function") {
        editor.onEditorContentChange(handleEditorUpdate);
      } else {
        console.error(
          "[QuickmemoEditor] エディタまたはonEditorContentChangeメソッドが存在しません"
        );
      }
    } catch (error) {
      console.error(
        "[QuickmemoEditor] エディタの変更イベント設定エラー:",
        error
      );
    }

    // クリーンアップ関数
    return () => {
      // BlockNoteEditorのonEditorContentChangeはunsubscribe関数を返さないため、
      // クリーンアップは必要ありません
    };
  }, [editor]);

  // ブロックをMarkdown形式に変換する関数
  const blocksToMarkdown = (blocks: Block[]): string => {
    // 簡易的な実装 - 実際のプロジェクトに合わせて調整が必要
    let markdown = "";

    for (const block of blocks) {
      if (block.type === "paragraph") {
        const text = block.content
          ? block.content
              .map((item) => {
                if ("text" in item) {
                  return item.text;
                }
                return "";
              })
              .join("")
          : "";
        markdown += text + "\n\n";
      } else if (block.type === "heading") {
        const level = block.props?.level || 1;
        const prefix = "#".repeat(level);
        const text = block.content
          ? block.content
              .map((item) => {
                if ("text" in item) {
                  return item.text;
                }
                return "";
              })
              .join("")
          : "";
        markdown += `${prefix} ${text}\n\n`;
      }
    }

    return markdown.trim();
  };

  const handleSaveToFile = useCallback(async () => {
    try {
      if (!editor) {
        toast.error("エディタが初期化されていません");
        return;
      }

      const blocks = editor.topLevelBlocks;
      if (blocks.length === 0) {
        toast.error("コンテンツが空です");
        return;
      }

      // ブロックの内容をMarkdown形式に変換
      const markdownContent = blocksToMarkdown(blocks);
      if (!markdownContent.trim()) {
        toast.error("コンテンツが空です");
        return;
      }

      const result = await handleNewFile(markdownContent, true);
      if (result?.success && result?.path) {
        localStorage.removeItem("unsaved_content");
        contentRef.current = "";
        navigateToFile(result.path);
        toast.success("ファイルを保存しました");
      }
    } catch (error) {
      console.error("Error saving file:", error);
      toast.error("ファイルの保存に失敗しました");
    }
  }, [editor, handleNewFile, navigateToFile]);

  if (isLoading) {
    return <div className={styles["loading"]}>読み込み中...</div>;
  }

  return (
    <div className={styles["editor-wrapper"]}>
      <div className={styles["editor-toolbar"]}>
        <button onClick={handleSaveToFile} className={styles["save-button"]}>
          <Icon icon="ph:floppy-disk" width={20} height={20} />
          <span>保存</span>
        </button>
      </div>
      <div className={styles["editor-container"]}>
        <FileEditor filePath={QUICKMEMO_PATH} initialContent={content} />
      </div>
    </div>
  );
}
