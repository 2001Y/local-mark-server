/**
 * QuickmemoEditor: クイックメモ機能のためのエディタコンポーネント
 *
 * 責任分担:
 * 1. 一時的なメモの編集と保存
 *   - ローカルストレージを使用した内容の永続化
 *   - 新規ファイルとしての保存機能
 *
 * 2. FileEditorとの連携
 *   - FileEditorコンポーネントを利用してエディタUIを表示
 *   - EditorContextを通じてエディタの状態にアクセス
 *
 * 3. クイックメモ固有の機能
 *   - 自動保存
 *   - 新規ファイルへの変換
 *
 * EditorContextとの連携:
 *   - EditorContextが提供する機能を利用
 *   - マークダウンパース処理はEditorContextに委譲
 *   - データの永続化はEditorContextに委譲
 */

"use client";

import { FileEditor } from "@/app/[...path]/FileEditor";
import { useCallback, useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { useAppPath } from "@/app/hooks/useAppPath";
import { toast } from "sonner";
import styles from "./quickmemo.module.css";
import { useFileActions } from "@/app/actions/client";
import { useEditor } from "@/app/context/EditorContext";
import * as BlockNotePackage from "@blocknote/core";

// 型の別名を定義
type Block = BlockNotePackage.Block;
type BlockNoteEditor = BlockNotePackage.BlockNoteEditor;

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
        // BlockNote v0.25.1のAPIに合わせてブロックを取得
        const editorAny = editor as any;
        let blocks: any[] = [];

        // document.blocksまたはdocument.getBlocksを使用
        if (editorAny.document) {
          if (typeof editorAny.document.getBlocks === "function") {
            blocks = editorAny.document.getBlocks();
            console.log("[QuickmemoEditor] document.getBlocksからブロック取得");
          } else if (editorAny.document.blocks) {
            blocks = editorAny.document.blocks;
            console.log("[QuickmemoEditor] document.blocksからブロック取得");
          } else {
            console.error(
              "[QuickmemoEditor] documentオブジェクトからブロックを取得できません"
            );
            return;
          }
        } else {
          console.error(
            "[QuickmemoEditor] documentオブジェクトが見つかりません"
          );
          return;
        }

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

  // 新規ファイルとして保存する
  const handleSaveAsNewFile = useCallback(async () => {
    if (!editor) {
      toast.error("エディタが初期化されていません");
      return;
    }

    try {
      // BlockNote v0.25.1のAPIに合わせてブロックを取得
      const editorAny = editor as any;
      let blocks: any[] = [];

      // document.blocksまたはdocument.getBlocksを使用
      if (editorAny.document) {
        if (typeof editorAny.document.getBlocks === "function") {
          blocks = editorAny.document.getBlocks();
        } else if (editorAny.document.blocks) {
          blocks = editorAny.document.blocks;
        } else {
          console.error(
            "[QuickmemoEditor] documentオブジェクトからブロックを取得できません"
          );
          toast.error("エディタの内容を取得できませんでした");
          return;
        }
      } else {
        console.error("[QuickmemoEditor] documentオブジェクトが見つかりません");
        toast.error("エディタの内容を取得できませんでした");
        return;
      }

      // ブロックの内容をMarkdownに変換
      const markdownContent = blocksToMarkdown(blocks);

      // 新規ファイルを作成
      const result = await handleNewFile(markdownContent, true);

      // resultがundefinedでないことを確認
      if (result && result.success && result.path) {
        // 成功したらlocalStorageをクリア
        localStorage.removeItem("unsaved_content");
        contentRef.current = "";
        setContent("");

        // 新しいファイルに移動
        navigateToFile(result.path);
        toast.success(`新規ファイルとして保存しました: ${result.path}`);
      } else {
        // エラーメッセージを安全に表示
        const errorMessage =
          result && "error" in result ? result.error : "不明なエラー";
        toast.error(`保存に失敗しました: ${errorMessage}`);
      }
    } catch (error) {
      console.error("[QuickmemoEditor] 保存エラー:", error);
      toast.error("保存中にエラーが発生しました");
    }
  }, [editor, handleNewFile, navigateToFile]);

  if (isLoading) {
    return <div className={styles["loading"]}>読み込み中...</div>;
  }

  return (
    <div className={styles["editor-wrapper"]}>
      <div className={styles["editor-toolbar"]}>
        <button onClick={handleSaveAsNewFile} className={styles["save-button"]}>
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
