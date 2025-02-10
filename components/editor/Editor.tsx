"use client";

import { BlockNoteEditor } from "@/components/editor/BlockNoteEditor";
import { useCallback } from "react";
import { toast } from "sonner";
import { Block } from "@blocknote/core";

export interface EditorProps {
  initialContent?: string;
  onSave: (content: string) => void;
  autoSave?: boolean;
  filePath?: string;
  blocks?: Block[];
}

export default function Editor({
  initialContent = "",
  onSave,
  autoSave = false,
  filePath,
  blocks,
}: EditorProps) {
  const handleSave = useCallback(
    async (newContent: string) => {
      try {
        await onSave(newContent);
      } catch (error) {
        console.error("[Editor] Save error:", error);
        toast.error("Failed to save changes");
      }
    },
    [onSave]
  );

  return (
    <BlockNoteEditor
      initialContent={initialContent}
      onSave={handleSave}
      autoSave={autoSave}
      filePath={filePath}
      initialBlocks={blocks}
    />
  );
}
