"use client";

import dynamic from "next/dynamic";
import { Block } from "@blocknote/core";

interface EditorProps {
  onSave: (content: string) => void;
  autoSave?: boolean;
  filePath?: string;
  initialContent?: string;
  blocks?: Block[];
}

const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => (
    <div className="editor-loading">
      <p>Loading editor...</p>
      <style jsx>{`
        .editor-loading {
          border: 1px solid var(--mantine-color-gray-3);
          border-radius: var(--mantine-radius-md);
          min-height: 500px;
          padding: var(--mantine-spacing-md);
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--mantine-color-gray-0);
          color: var(--mantine-color-gray-7);
          font-family: var(--mantine-font-family);
        }
      `}</style>
    </div>
  ),
});

// キャッシュを無効化して常に新しいインスタンスを作成
export function DynamicEditor({
  onSave,
  autoSave = true,
  filePath,
  initialContent,
  blocks,
}: EditorProps) {
  return (
    <Editor
      onSave={onSave}
      autoSave={autoSave}
      filePath={filePath}
      initialContent={initialContent}
      blocks={blocks}
    />
  );
}
