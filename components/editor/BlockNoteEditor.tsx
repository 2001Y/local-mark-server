"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BlockNoteViewRaw, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";
import "@blocknote/react/style.css";
import { toast } from "sonner";
import { Block } from "@blocknote/core";

interface BlockNoteEditorProps {
  initialContent?: string;
  onSave?: (content: string) => void;
  autoSave?: boolean;
  filePath?: string;
  initialBlocks?: Block[];
}

export function BlockNoteEditor({
  initialContent = "",
  onSave,
  autoSave = false,
  filePath,
  initialBlocks,
}: BlockNoteEditorProps) {
  const [isUpdatingContent, setIsUpdatingContent] = useState(false);
  const lastSavedContent = useRef<string>(initialContent);
  const editor = useCreateBlockNote();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 初期コンテンツの設定
  useEffect(() => {
    if (!editor) return;

    const initializeContent = async () => {
      try {
        if (initialBlocks && initialBlocks.length > 0) {
          // 直接ブロックを設定
          editor.replaceBlocks(editor.document, initialBlocks);
          const markdown = await editor.blocksToMarkdownLossy(initialBlocks);
          lastSavedContent.current = markdown;
        } else if (initialContent) {
          // Markdownからブロックに変換
          const blocks = await editor.tryParseMarkdownToBlocks(initialContent);
          editor.replaceBlocks(editor.document, blocks);
          lastSavedContent.current = initialContent;
        }
      } catch (error) {
        console.error("Error initializing content:", error);
        toast.error("コンテンツの読み込みに失敗しました");
      }
    };

    initializeContent();
  }, [editor, initialContent, initialBlocks]);

  useEffect(() => {
    if (!editor || isUpdatingContent) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        await handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor, isUpdatingContent]);

  const handleSave = useCallback(async () => {
    if (!editor || !onSave || isUpdatingContent) return;

    try {
      const markdown = await editor.blocksToMarkdownLossy(editor.document);

      if (markdown === lastSavedContent.current) return;

      await onSave(markdown);
      lastSavedContent.current = markdown;
    } catch (error) {
      console.error("Failed to save content:", error);
      toast.error("Failed to save changes");
    }
  }, [editor, onSave, isUpdatingContent]);

  const debouncedHandleSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      handleSave();
    }, 1000); // 1秒のデバウンス時間
  }, [handleSave]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (autoSave && editor && !isUpdatingContent) {
      const interval = setInterval(handleSave, 5000);
      return () => clearInterval(interval);
    }
  }, [autoSave, editor, handleSave, isUpdatingContent]);

  if (!editor) return null;

  return (
    <BlockNoteViewRaw
      editor={editor}
      theme="light"
      onChange={() => {
        if (autoSave) {
          debouncedHandleSave();
        }
      }}
      sideMenu={false}
      formattingToolbar={false}
    />
  );
}

BlockNoteEditor.displayName = "BlockNoteEditor";
