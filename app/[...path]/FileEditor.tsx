"use client";

import { useCallback, useEffect, useState } from "react";
import { DynamicEditor } from "@/components/editor/DynamicEditor";
import { getFileContent, saveFile } from "../actions/fileActions";
import { toast } from "sonner";
import { useEditor } from "../context/EditorContext";
import { Block } from "@blocknote/core";

interface FileEditorProps {
  filePath: string;
  initialContent?: string;
}

export function FileEditor({ filePath, initialContent }: FileEditorProps) {
  const [content, setContent] = useState<string>(initialContent || "");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const { loadContent, editor } = useEditor();

  // コンテンツの読み込み
  useEffect(() => {
    const loadData = async () => {
      const { blocks, isUpdated, source } = await loadContent(filePath);
      setBlocks(blocks);

      if (isUpdated) {
        toast.info(`新しいバージョンが ${source} から読み込まれました`);
      } else if (source) {
        toast.success(`${source} からコンテンツを読み込みました`);
      }
    };

    loadData();
  }, [filePath, loadContent]);

  // ブロックからMarkdownへの変換
  useEffect(() => {
    const convertToMarkdown = async () => {
      if (editor && blocks.length > 0) {
        const markdown = await editor.blocksToMarkdownLossy(blocks);
        setContent(markdown);
      }
    };

    convertToMarkdown();
  }, [blocks, editor]);

  const handleSave = useCallback(
    async (newContent: string) => {
      try {
        const result = await saveFile(filePath, newContent);
        if (result.success) {
          toast.success("ファイルを保存しました");
          // 保存成功後、新しいコンテンツでキャッシュを更新
          if (editor) {
            const newBlocks = await editor.tryParseMarkdownToBlocks(newContent);
            setBlocks(newBlocks);
          }
        } else {
          toast.error(result.error || "ファイルを保存できませんでした");
        }
      } catch (error) {
        console.error("Error saving file:", error);
        toast.error("ファイルを保存できませんでした");
      }
    },
    [filePath, editor]
  );

  return (
    <div className="editor-container">
      <DynamicEditor
        onSave={handleSave}
        autoSave={true}
        filePath={filePath}
        initialContent={content}
        blocks={blocks}
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
