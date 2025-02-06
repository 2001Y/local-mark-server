import { useCallback } from "react";
import { Block } from "@blocknote/core";

export function useEditorWorker() {
  const convertToMarkdown = useCallback(async (blocks: Block[]) => {
    try {
      // BlockNoteのMarkdown変換機能を直接使用
      const markdown = blocks
        .map((block) => {
          let text = block.content?.map((item) => item.text).join("") || "";

          // ブロックタイプに応じたMarkdown記法を適用
          switch (block.type) {
            case "heading":
              const level = block.props.level || 1;
              return "#".repeat(level) + " " + text;
            case "bulletListItem":
              return "- " + text;
            case "numberedListItem":
              return "1. " + text; // 実際の番号は表示時に自動的に付与される
            case "paragraph":
            default:
              return text;
          }
        })
        .join("\n\n");

      return markdown;
    } catch (error) {
      console.error("Error converting to markdown:", error);
      throw error;
    }
  }, []);

  const saveContent = useCallback(async (blocks: Block[]) => {
    try {
      // ここでは単純にtrueを返す
      // 実際の保存処理は上位コンポーネントで行う
      return true;
    } catch (error) {
      console.error("Error saving content:", error);
      throw error;
    }
  }, []);

  return {
    convertToMarkdown,
    saveContent,
  };
}
