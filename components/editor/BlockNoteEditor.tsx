"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BlockNoteViewRaw, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";
import "@blocknote/react/style.css";
import { toast } from "sonner";

interface BlockNoteEditorProps {
  initialContent?: string;
  onSave?: (content: string) => void;
  autoSave?: boolean;
  filePath?: string;
}

export function BlockNoteEditor({
  initialContent = "",
  onSave,
  autoSave = false,
  filePath,
}: BlockNoteEditorProps) {
  const [isUpdatingContent, setIsUpdatingContent] = useState(false);
  const lastSavedContent = useRef<string>(initialContent);

  const editor = useCreateBlockNote({
    initialContent: initialContent ? JSON.parse(initialContent) : undefined,
  });

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
      const markdown = editor.topLevelBlocks
        .map((block) => block.content?.toString() || "")
        .join("\n");

      if (markdown === lastSavedContent.current) return;

      await onSave(markdown);
      lastSavedContent.current = markdown;
    } catch (error) {
      console.error("Failed to save content:", error);
      toast.error("Failed to save changes");
    }
  }, [editor, onSave, isUpdatingContent]);

  useEffect(() => {
    if (autoSave && editor && !isUpdatingContent) {
      const interval = setInterval(handleSave, 5000);
      return () => clearInterval(interval);
    }
  }, [autoSave, editor, handleSave, isUpdatingContent]);

  if (!editor) return null;

  return <BlockNoteViewRaw editor={editor} theme="light" sideMenu={false} />;
}

BlockNoteEditor.displayName = "BlockNoteEditor";
