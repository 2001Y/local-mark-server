"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { BlockNoteEditor, Block } from "@blocknote/core";
import { useBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { MantineProvider, createTheme } from "@mantine/core";
import "@blocknote/core/style.css";
import "@mantine/core/styles.css";
import "@blocknote/mantine/style.css";
import {
  getBlockCache,
  setBlockCache,
  clearBlockCache,
  getCacheStats,
  isContentUpdated,
} from "../lib/blockCache";
import { getFileContent } from "../actions/server";

type DataSource = "server" | "localStorage" | "context";

interface SourceData {
  source: DataSource;
  blocks: Block[] | null;
  error?: string | null;
}

interface EditorState {
  blocks: Block[] | null;
  source: DataSource | null;
  priority: number | null; // 現在反映されているデータの優先度
}

// 優先度の定義
const SOURCE_PRIORITY: Record<DataSource, number> = {
  server: 1,
  localStorage: 2,
  context: 3,
} as const;

// 初期状態
const initialEditorState: EditorState = {
  blocks: null,
  source: null,
  priority: null,
};

interface EditorContextType {
  editor: BlockNoteEditor | null;
  cachedBlocks: Map<string, Block[]>;
  setCachedBlocks: (path: string, blocks: Block[]) => void;
  clearCachedBlocks: (path: string) => void;
  editorViewRef: React.RefObject<HTMLDivElement>;
  setEditorOnChange: (onChange?: () => void) => void;
  isProcessing: boolean;
  cacheStats: { totalSize: number; count: number };
  loadContent: (
    path: string
  ) => Promise<{ blocks: Block[]; isUpdated: boolean; source: string | null }>;
}

const EditorContext = createContext<EditorContextType | null>(null);

interface EditorProviderProps {
  children: React.ReactNode;
}

export function EditorProvider({ children }: EditorProviderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cacheStats, setCacheStats] = useState({ totalSize: 0, count: 0 });
  const [cachedBlocks, setCachedBlocksState] = useState<Map<string, Block[]>>(
    new Map()
  );
  const [onChange, setOnChange] = useState<(() => void) | undefined>();

  // エディタの設定
  const editorConfig = useMemo(
    () => ({
      initialContent: undefined,
      // リンク関連の設定を追加
      linkifyConfig: {
        // リンクの初期化を一度だけ行うように設定
        init: false,
      },
    }),
    []
  );

  const editor = useBlockNote(editorConfig);
  const editorViewRef = useRef<HTMLDivElement>(null);
  const editorState = useRef<EditorState>(initialEditorState);

  const setEditorOnChange = useCallback((newOnChange?: () => void) => {
    setOnChange(() => newOnChange);
  }, []);

  // キャッシュ操作
  const setCachedBlocks = useCallback((path: string, blocks: Block[]) => {
    setCachedBlocksState((prev) => {
      const next = new Map(prev);
      next.set(path, blocks);
      return next;
    });
    setBlockCache(path, blocks); // ローカルストレージにも保存
    setCacheStats(getCacheStats());
  }, []);

  const clearCachedBlocks = useCallback((path: string) => {
    setCachedBlocksState((prev) => {
      const next = new Map(prev);
      next.delete(path);
      return next;
    });
    clearBlockCache(path);
    setCacheStats(getCacheStats());
  }, []);

  // コンテンツの並行読み込みと更新チェック
  const loadContent = useCallback(
    async (path: string) => {
      setIsProcessing(true);
      let isUpdated = false;
      console.log(`[EditorContext] 🔄 ${path} のコンテンツ読み込みを開始`);

      // エディタの状態をリセット
      editorState.current = initialEditorState;

      // データ適用の判定ロジック
      const shouldApplyData = (newData: SourceData): boolean => {
        // 初回アクセスの判定
        if (!editorState.current.blocks || !editorState.current.source) {
          console.log(
            `[EditorContext] ✨${newData.source}: 初回アクセスのため反映`
          );
          return true;
        }

        // データの構造チェック
        if (!newData.blocks || !Array.isArray(newData.blocks)) {
          console.log(`[EditorContext] ⚠️${newData.source}: 無効なデータ形式`);
          if (newData.source !== "server") {
            // サーバー以外でエラーの場合はキャッシュクリア
            clearCachedBlocks(path);
          }
          return false;
        }

        // 優先度チェック
        const currentPriority = editorState.current.priority!;
        const newPriority = SOURCE_PRIORITY[newData.source];

        if (currentPriority < newPriority) {
          console.log(
            `[EditorContext] 💭${newData.source}: 既に優先度の高いデータ(${editorState.current.source})が反映済みのため反映をスキップ`
          );
          return false;
        }

        // 差分チェック
        const hasDiff = isContentUpdated(
          editorState.current.blocks,
          newData.blocks
        );
        console.log(
          `[EditorContext] ${hasDiff ? "✨" : "💭"}${newData.source}: 差分${
            hasDiff ? "あり" : "なし"
          }のため${hasDiff ? "反映" : "スキップ"}`
        );
        return hasDiff;
      };

      // データ適用ロジック
      const applyData = async (data: SourceData): Promise<boolean> => {
        if (!data.blocks || !Array.isArray(data.blocks)) {
          return false;
        }

        if (shouldApplyData(data)) {
          const blocks = data.blocks as Block[];
          const priority = SOURCE_PRIORITY[data.source];

          // 状態の更新
          editorState.current = {
            blocks,
            source: data.source,
            priority,
          };

          // エディタのコンテンツを更新
          if (editor) {
            await editor.replaceBlocks(editor.topLevelBlocks, blocks);
          }

          // キャッシュの更新（contextの場合を除く）
          if (data.source !== "context") {
            console.log(
              `[EditorContext] 💾${data.source}: ${blocks.length}個のブロックを保存`
            );
            setCachedBlocks(path, blocks);
          }

          isUpdated = true;
          return true;
        }

        return false;
      };

      // データソースからの取得処理を定義
      const fetchSources: Record<DataSource, () => Promise<SourceData>> = {
        context: async () => {
          try {
            const blocks = cachedBlocks.get(path);
            console.log(
              `[EditorContext] 📍Context: ${
                blocks ? `${blocks.length}個のブロック取得` : "データなし"
              }`
            );
            return {
              source: "context",
              blocks: blocks ?? null,
            };
          } catch (error) {
            console.error("[EditorContext] ❌Context: 取得失敗", error);
            return {
              source: "context",
              blocks: null,
              error: "キャッシュ取得エラー",
            };
          }
        },
        localStorage: async () => {
          try {
            const blocks = getBlockCache(path);
            console.log(
              `[EditorContext] 📍LocalStorage: ${
                blocks ? `${blocks.length}個のブロック取得` : "データなし"
              }`
            );
            if (blocks && !Array.isArray(blocks)) {
              console.warn("[EditorContext] ⚠️LocalStorage: 不正なデータ形式");
              return {
                source: "localStorage",
                blocks: null,
                error: "不正なデータ形式",
              };
            }
            return { source: "localStorage", blocks };
          } catch (error) {
            console.error("[EditorContext] ❌LocalStorage: 取得失敗", error);
            return {
              source: "localStorage",
              blocks: null,
              error: "ストレージ取得エラー",
            };
          }
        },
        server: async () => {
          console.log("[EditorContext] 📍Server: データ取得開始");
          try {
            const result = await getFileContent(path);
            if (result.success && result.data && editor) {
              const blocks = await editor.tryParseMarkdownToBlocks(result.data);
              console.log(
                `[EditorContext] 📍Server: ${blocks.length}個のブロック取得`
              );
              return { source: "server", blocks };
            }
            console.log("[EditorContext] ⚠️Server: データ取得失敗");
            return {
              source: "server",
              blocks: null,
              error: result.error || "データ取得エラー",
            };
          } catch (error) {
            console.error("[EditorContext] ❌Server: 取得失敗", error);
            return {
              source: "server",
              blocks: null,
              error: error instanceof Error ? error.message : "不明なエラー",
            };
          }
        },
      };

      try {
        // 各データソースからの取得を個別に開始し、完了を待つ
        await Promise.all(
          Object.entries(fetchSources).map(async ([source, fetch]) => {
            try {
              const data = await fetch();
              await applyData(data);
            } catch (error) {
              console.error(
                `[EditorContext] ❌ ${source}の取得でエラー:`,
                error
              );
            }
          })
        );
      } catch (error) {
        console.error("[EditorContext] ❌ 予期せぬエラー:", error);
      } finally {
        setIsProcessing(false);
        console.log(
          `[EditorContext] 🏁 読み込み完了: source=${
            editorState.current.source
          }, priority=${editorState.current.priority}, blocks=${
            editorState.current.blocks?.length ?? 0
          }個`
        );
      }

      return {
        blocks: editorState.current.blocks || [],
        isUpdated,
        source: editorState.current.source,
      };
    },
    [editor, cachedBlocks, setCachedBlocks]
  );

  const contextValue = useMemo(
    () => ({
      editor,
      cachedBlocks,
      setCachedBlocks,
      clearCachedBlocks,
      editorViewRef,
      setEditorOnChange,
      isProcessing,
      cacheStats,
      loadContent,
    }),
    [
      editor,
      cachedBlocks,
      setCachedBlocks,
      clearCachedBlocks,
      setEditorOnChange,
      isProcessing,
      cacheStats,
      loadContent,
    ]
  );

  return (
    <EditorContext.Provider value={contextValue}>
      <div style={{ display: "contents" }}>
        <div
          ref={editorViewRef}
          className="editor-wrapper"
          style={{ display: "none" }}
        >
          <MantineProvider
            theme={createTheme({
              primaryColor: "blue",
              fontFamily: "Inter, sans-serif",
            })}
            defaultColorScheme="light"
          >
            {editor && <BlockNoteView editor={editor} onChange={onChange} />}
          </MantineProvider>
        </div>
        <style jsx global>{`
          .editor-wrapper {
            height: 100%;
            position: relative;
          }
          .editor-wrapper .bn-container {
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .bn-editor {
            padding-inline: 0 !important;
            flex: 1;
            overflow-y: auto;
          }
          .editor-wrapper .mantine-BlockNoteEditor-root {
            height: 100%;
          }
          .bn-block-group {
            padding: 1.5em 0;
          }
        `}</style>
        {children}
      </div>
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
}
