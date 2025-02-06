"use client";

import { useCallback, useEffect, useState } from "react";
import { DynamicEditor } from "@/components/editor/DynamicEditor";
import { getFileContent, saveFile } from "../actions/fileActions";
import { toast } from "sonner";

interface FileEditorProps {
  filePath: string;
  initialContent?: string;
}

export function FileEditor({ filePath, initialContent }: FileEditorProps) {
  const [content, setContent] = useState<string>(initialContent || "");

  useEffect(() => {
    if (!initialContent) {
      const loadContent = async () => {
        const result = await getFileContent(filePath);
        if (result.success && result.content) {
          setContent(result.content);
        } else {
          toast.error(result.error || "ファイルを読み込めませんでした");
        }
      };
      loadContent();
    }
  }, [filePath, initialContent]);

  const handleSave = useCallback(
    async (newContent: string) => {
      const result = await saveFile(filePath, newContent);
      if (result.success) {
        toast.success("ファイルを保存しました");
      } else {
        toast.error(result.error || "ファイルを保存できませんでした");
      }
    },
    [filePath]
  );

  return (
    <div className="editor-container">
      <DynamicEditor
        onSave={handleSave}
        autoSave={true}
        filePath={filePath}
        initialContent={content}
      />
      <style jsx>{`
        .editor-container {
          height: 100%;
          padding: 1rem;
        }
      `}</style>
    </div>
  );
}
