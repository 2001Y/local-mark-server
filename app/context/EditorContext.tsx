/**
 * EditorContext: アプリケーション全体のエディタ状態管理を担当するコンテキスト
 *
 * 責任分担:
 * 1. グローバルなエディタ状態管理
 *   - BlockNoteEditorインスタンスの作成と管理
 *   - アプリケーション全体でのエディタ共有
 *   - エディタの状態（ブロック、ソース、優先度）の管理
 *
 * 2. データの永続化と同期
 *   - サーバー、ローカルストレージ、コンテキストの3つのデータソースを管理
 *   - 各ソースの優先度に基づいて最新のデータを提供
 *   - ファイルの保存処理を担当
 *
 * 3. マークダウンパース機能の一元管理
 *   - マークダウンテキストをBlockNoteのブロック構造に変換
        - パースにはBlackNote.jsの公式APIのみを使用
        - tryParseMarkdownToBlocks：Markdownをブロックに変換
        - blocksToMarkdownLossy：ブロックをMarkdownに変換
        - replaceBlocks：エディタのドキュメントを更新
        - https://www.blocknotejs.org/docs/editor-api/converting-blocks
 *   - パース結果のキャッシュ管理
 *   - エディタ初期化前のマークダウンデータを一時保存し、初期化後に処理
 *
 * 4. 共通機能の提供
 *   - loadContent: ファイルの内容を読み込む
 *   - setCachedBlocks: ブロックをキャッシュに保存
 *   - clearCachedBlocks: キャッシュをクリア
 *   - エディタの参照を提供
 *
 * FileEditorとの連携:
 *   - FileEditorはuseEditorフックを通じてこのコンテキストにアクセス
 *   - FileEditorはUIとユーザーインタラクションを担当し、データ操作はこのコンテキストに委譲
 *   - マークダウンパース処理もこのコンテキストに委譲
 */

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
import * as BlockNotePackage from "@blocknote/core";
import "@blocknote/core/style.css";
import "@mantine/core/styles.css";
import "@blocknote/mantine/style.css";
import { getBlockCache, setBlockCache, getCacheStats } from "../lib/blockCache";
import { getFileContent, saveFile } from "../actions/server";
import { createHash } from "crypto";
import { toast } from "sonner";

// ハッシュ関数の定義
const hashContent = (content: string): string => {
  return createHash("sha256").update(content).digest("hex").slice(0, 8);
};

type DataSource = "server" | "localStorage" | "context";

interface SourceData {
  source: DataSource;
  blocks: BlockNotePackage.Block[] | null;
  error?: string | null;
  path: string;
}

// エディタの状態を表す型
interface EditorState {
  blocks: BlockNotePackage.Block[] | null;
  source: DataSource | null;
  priority: number;
}

// 優先度の定義
const SOURCE_PRIORITY: Record<DataSource, number> = {
  server: 1,
  localStorage: 2,
  context: 3,
} as const;

interface EditorContextType {
  editor: BlockNotePackage.BlockNoteEditor | null;
  cachedBlocks: Map<string, BlockNotePackage.Block[]>;
  setCachedBlocks: (
    path: string,
    blocks: BlockNotePackage.Block[]
  ) => Promise<boolean>;
  clearCachedBlocks: (path: string) => void;
  editorViewRef: React.RefObject<HTMLDivElement>;
  setEditorOnChange: (onChange?: () => void) => void;
  isProcessing: boolean;
  cacheStats: { totalSize: number; count: number };
  loadContent: (path: string) => Promise<{
    blocks: BlockNotePackage.Block[];
    isUpdated: boolean;
    source: string | null;
  }>;
}

const EditorContext = createContext<EditorContextType | null>(null);

interface EditorProviderProps {
  children: React.ReactNode;
}

export function EditorProvider({ children }: EditorProviderProps) {
  console.log("[EditorProvider] 🔄 レンダリング");

  // 状態管理の最適化
  const [isProcessing, setIsProcessing] = useState(false);
  const [cacheStats, setCacheStats] = useState({ totalSize: 0, count: 0 });
  const [cachedBlocks, setCachedBlocksState] = useState<
    Map<string, BlockNotePackage.Block[]>
  >(new Map());
  const [error, setError] = useState<Error | null>(null);

  // すべてのrefをuseRefで最適化
  const onChangeRef = useRef<(() => void) | undefined>();
  const editorRef = useRef<BlockNotePackage.BlockNoteEditor | null>(null);
  const editorViewRef = useRef<HTMLDivElement>(null);
  const editorStateRef = useRef<{
    blocks: BlockNotePackage.Block[] | null;
    source: DataSource | null;
    priority: number;
  }>({
    blocks: null,
    source: null,
    priority: 0,
  });
  const renderCountRef = useRef(0);
  // 処理中フラグをrefで管理
  const isProcessingRef = useRef(false);
  // 最後に適用されたコンテンツのハッシュを保持
  const lastContentHashRef = useRef<string | null>(null);

  // 一時保存用のマークダウンデータを管理するref
  const pendingMarkdownRef = useRef<Map<string, string>>(new Map());

  // レンダリングの原因を特定するためのログ
  useEffect(() => {
    console.log("[EditorProvider] 🔍 レンダリングの原因:", {
      isProcessing,
      cacheStatsSize: cacheStats.totalSize,
      cacheStatsCount: cacheStats.count,
      cachedBlocksSize: cachedBlocks.size,
    });
  }, [isProcessing, cacheStats, cachedBlocks]);

  // レンダリング回数のカウントを開発環境でのみ行う
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      renderCountRef.current += 1;
      console.log(
        `[EditorProvider] 📊 レンダリング回数: ${renderCountRef.current}`
      );
    }
  });

  // setEditorOnChangeをrefを使用して最適化
  const setEditorOnChange = useCallback((newOnChange?: () => void) => {
    console.log("[EditorProvider] 🎯 setEditorOnChange called");
    onChangeRef.current = newOnChange;
  }, []); // 依存配列を空に

  // 最後に処理したパスと時間を追跡するref
  const lastProcessedPathRef = useRef<string>("");
  const lastContentFetchTimeRef = useRef<number>(0);
  const loadContentCallCountRef = useRef<number>(0);
  const pathCallCountMapRef = useRef<Map<string, number>>(new Map());

  // データ適用の判定ロジックを最適化
  const shouldApplyData = useCallback((data: SourceData): boolean => {
    console.log(`[EditorProvider] 🧐 shouldApplyData called for:`, {
      source: data.source,
      path: data.path,
      hasBlocks: !!data.blocks,
    });

    // エラーがある場合は適用しない
    if (data.error) {
      console.log(
        `[EditorProvider] ⚠️ データにエラーがあるため適用しません:`,
        data.error
      );
      return false;
    }

    // ブロックがない場合は適用しない
    if (!data.blocks) {
      console.log(
        `[EditorProvider] ⚠️ ブロックがないため適用しません: ${data.source}`
      );
      return false;
    }

    // 現在のデータの優先度を確認
    const currentSource = editorStateRef.current.source;
    const currentPriority = editorStateRef.current.priority;

    // 新しいデータの優先度を確認
    const newPriority = SOURCE_PRIORITY[data.source];

    console.log(`[EditorProvider] 📊 データ優先度比較:`, {
      currentSource,
      currentPriority,
      newSource: data.source,
      newPriority,
    });

    // contextとlocalStorageからのデータを優先
    if (data.source === "context" || data.source === "localStorage") {
      console.log(
        `[EditorProvider] ✅ ${data.source}からのデータを優先的に適用します`
      );
      return true;
    }

    // 優先度が高い場合のみ適用
    if (newPriority > currentPriority) {
      console.log(
        `[EditorProvider] ✅ 優先度が高いため適用します: ${data.source} > ${currentSource}`
      );
      return true;
    }

    // 同じソースからの更新の場合は適用
    if (data.source === currentSource) {
      console.log(
        `[EditorProvider] ✅ 同じソースからの更新のため適用します: ${data.source}`
      );
      return true;
    }

    console.log(
      `[EditorProvider] ⏭️ 優先度が低いため適用しません: ${data.source} < ${currentSource}`
    );
    return false;
  }, []);

  // データの適用
  const applyData = useCallback(
    async (data: SourceData): Promise<boolean> => {
      if (!data.blocks || !shouldApplyData(data)) {
        console.log(
          "[EditorProvider] ⚠️ applyData: データが適用条件を満たしていません",
          {
            hasBlocks: !!data.blocks,
            blocksLength: data.blocks?.length || 0,
            shouldApply: shouldApplyData(data),
            source: data.source,
            path: data.path,
          }
        );
        return false;
      }

      // editorStateRefを更新
      editorStateRef.current = {
        blocks: data.blocks,
        source: data.source,
        priority: SOURCE_PRIORITY[data.source],
      };

      console.log(
        `[EditorProvider] 🔄 applyData: ${data.source}からのデータを適用します`,
        {
          blocksCount: data.blocks.length,
          path: data.path,
          firstBlock:
            data.blocks.length > 0
              ? JSON.stringify(data.blocks[0]).substring(0, 100) + "..."
              : null,
        }
      );

      // エディタのコンテンツを更新
      if (editorRef.current) {
        try {
          const editorAny = editorRef.current as any;

          // デバッグ: replaceBlocks関数の存在確認
          console.log(`[EditorProvider] 🔍 replaceBlocks関数確認:`, {
            exists: typeof editorAny.replaceBlocks === "function",
            editorMethods: Object.keys(editorAny).slice(0, 10),
            documentExists: !!editorAny.document,
            documentType: editorAny.document
              ? typeof editorAny.document
              : "undefined",
            documentProps: editorAny.document
              ? Object.keys(editorAny.document).slice(0, 10)
              : [],
          });

          if (
            typeof editorAny.replaceBlocks === "function" &&
            editorAny.document
          ) {
            console.log("[EditorProvider] 🔄 replaceBlocksを実行します");
            await editorAny.replaceBlocks(editorAny.document, data.blocks);
            console.log(
              `[EditorProvider] ✅ エディタのコンテンツを更新しました`
            );
          } else {
            console.error(
              "[EditorProvider] ❌ replaceBlocksメソッドまたはdocumentプロパティが見つかりません"
            );
            return false;
          }
        } catch (error) {
          console.error(
            `[EditorProvider] ❌ エディタのコンテンツ更新に失敗:`,
            error
          );
          return false;
        }
      } else {
        console.error("[EditorProvider] ❌ editorRefがnullです");
        return false;
      }

      // 非同期でキャッシュを更新
      setTimeout(() => {
        setCachedBlocksState((prev) => {
          const next = new Map(prev);
          // nullチェックを追加して型エラーを解消
          if (data.blocks !== null) {
            next.set(data.path, data.blocks);
          }
          return next;
        });
      }, 0);

      return true;
    },
    [shouldApplyData]
  );

  // データソースの定義
  const fetchSources = useMemo(() => {
    const sources: Record<DataSource, (path: string) => Promise<SourceData>> = {
      context: async (path: string) => {
        try {
          const blocks = cachedBlocks.get(path);
          if (blocks && blocks.length > 0) {
            console.log(
              `[EditorContext] 📍Context: ${blocks.length}個のブロック取得 (キャッシュヒット)`
            );
            return {
              source: "context",
              blocks,
              path,
            };
          } else {
            console.log(
              `[EditorContext] 📍Context: データなし (キャッシュミス)`
            );
            return {
              source: "context",
              blocks: null,
              path,
            };
          }
        } catch (error) {
          console.error("[EditorContext] ❌Context: 取得失敗", error);
          return {
            source: "context",
            blocks: null,
            error: "キャッシュ取得エラー",
            path,
          };
        }
      },
      localStorage: async (path: string) => {
        try {
          const blocks = getBlockCache(path);
          if (blocks && Array.isArray(blocks) && blocks.length > 0) {
            console.log(
              `[EditorContext] 📍LocalStorage: ${blocks.length}個のブロック取得 (キャッシュヒット)`
            );
            return { source: "localStorage", blocks, path };
          } else if (blocks && !Array.isArray(blocks)) {
            console.warn("[EditorContext] ⚠️LocalStorage: 不正なデータ形式");
            return {
              source: "localStorage",
              blocks: null,
              error: "不正なデータ形式",
              path,
            };
          } else {
            console.log(
              `[EditorContext] 📍LocalStorage: データなし (キャッシュミス)`
            );
            return { source: "localStorage", blocks: null, path };
          }
        } catch (error) {
          console.error("[EditorContext] ❌LocalStorage: 取得失敗", error);
          return {
            source: "localStorage",
            blocks: null,
            error: "ストレージ取得エラー",
            path,
          };
        }
      },
      server: async (path: string) => {
        console.log("[EditorProvider] 📍Server: データ取得開始");
        try {
          const result = await getFileContent(path);
          console.log("[EditorProvider] 📍Server: getFileContent結果:", {
            success: result.success,
            hasData: !!result.data,
            dataLength: result.data?.length || 0,
            error: result.error,
          });

          if (result.success && editorRef.current) {
            console.log("[EditorProvider] 📍Server: Markdownパース開始");

            // データが空の場合は空のブロックを返す
            if (!result.data || result.data.trim() === "") {
              console.log(
                "[EditorProvider] 📍Server: 空のMarkdownデータ、空のブロックを返します"
              );
              return {
                source: "server",
                blocks: [],
                path,
              };
            }

            // データのプレビューを出力
            console.log(
              "[EditorProvider] 📍Server: Markdownデータプレビュー:",
              result.data.length > 100
                ? result.data.substring(0, 100) + "..."
                : result.data
            );

            try {
              // editorをany型として扱い、型エラーを回避
              const editorAny = editorRef.current as any;

              // BlockNote.jsの公式APIを使用: tryParseMarkdownToBlocks
              if (typeof editorAny.tryParseMarkdownToBlocks === "function") {
                console.log(
                  "[EditorProvider] 📍Server: tryParseMarkdownToBlocksを使用します"
                );

                // Markdownをブロックに変換
                const blocks = await editorAny.tryParseMarkdownToBlocks(
                  result.data
                );

                console.log(
                  `[EditorContext] 📍Server: ${
                    blocks?.length || 0
                  }個のブロック取得 (サーバー取得成功)`
                );
                console.log("[EditorProvider] 📍Server: ブロック詳細:", {
                  count: blocks?.length || 0,
                  isArray: Array.isArray(blocks),
                  firstBlock:
                    blocks?.length > 0
                      ? JSON.stringify(blocks[0]).substring(0, 100) + "..."
                      : null,
                });

                // 取得したデータをキャッシュに保存（非同期で実行）
                setTimeout(() => {
                  setCachedBlocksState((prev) => {
                    const next = new Map(prev);
                    // nullチェックを追加して型エラーを解消
                    if (blocks !== null) {
                      next.set(path, blocks);
                    }
                    return next;
                  });
                  console.log(
                    `[EditorContext] 📍Server: 取得したデータをキャッシュに保存`
                  );
                }, 0);

                return { source: "server", blocks, path };
              } else {
                console.error(
                  "[EditorProvider] 📍Server: tryParseMarkdownToBlocksメソッドが見つかりません"
                );
                throw new Error(
                  "tryParseMarkdownToBlocksメソッドが見つかりません"
                );
              }
            } catch (error) {
              console.error("[EditorContext] ❌Server: パース失敗", error);
              return {
                source: "server",
                blocks: [],
                error: error instanceof Error ? error.message : "パースエラー",
                path,
              };
            }
          }

          // editorRefがnullの場合、マークダウンデータを一時保存
          if (result.success) {
            // editorRefがnullだが、データは取得できている場合
            if (!editorRef.current && result.data) {
              console.log(
                "[EditorContext] ⚠️Server: editorRefがnullですが、マークダウンデータは取得できています"
              );

              // マークダウンデータを一時保存
              pendingMarkdownRef.current.set(path, result.data);

              console.log(
                `[EditorContext] 📍Server: マークダウンデータを一時保存しました: ${path}`
              );

              // 空のブロックを返す（後でエディタが初期化されたときに処理される）
              return {
                source: "server",
                blocks: [],
                path,
              };
            } else {
              console.log(
                "[EditorContext] ⚠️Server: データ取得失敗 - 不明な理由"
              );
            }
          } else {
            console.log("[EditorContext] ⚠️Server: データ取得失敗 - APIエラー");
          }

          return {
            source: "server",
            blocks: null,
            error: result.error || "データ取得エラー",
            path,
          };
        } catch (error) {
          console.error("[EditorContext] ❌Server: 取得失敗", error);
          return {
            source: "server",
            blocks: null,
            error: error instanceof Error ? error.message : "不明なエラー",
            path,
          };
        }
      },
    };
    return sources;
  }, [cachedBlocks, editorRef]);

  // データの取得を一元管理する関数
  const getContent = useCallback(
    async (
      path: string
    ): Promise<{
      blocks: BlockNotePackage.Block[] | null;
      source: DataSource | null;
      isUpdated: boolean;
    }> => {
      console.log(`[EditorProvider] 🔍 getContent called for path: ${path}`);
      console.log(`[EditorProvider] 🔄 getContent dependencies:`, {
        isProcessing,
        fetchSourcesRef: !!fetchSources,
        shouldApplyDataRef: !!shouldApplyData,
        applyDataRef: !!applyData,
      });

      // 既に処理中の場合はスキップ
      if (isProcessing) {
        console.log(`[EditorProvider] ⏳ 処理中のため取得をスキップ: ${path}`);
        return {
          blocks: editorStateRef.current.blocks,
          source: editorStateRef.current.source,
          isUpdated: false,
        };
      }

      // 最後に処理したパスと同じ場合、かつ短時間での再取得の場合はスキップ
      if (
        path === lastProcessedPathRef.current &&
        loadContentCallCountRef.current > 1
      ) {
        const timeSinceLastCall =
          Date.now() - (lastContentFetchTimeRef.current || 0);
        if (timeSinceLastCall < 5000) {
          // 5秒以内の再取得はスキップ
          console.log(
            `[EditorProvider] ⏭️ 短時間での再取得をスキップ: ${path}, 前回の取得から ${timeSinceLastCall}ms`
          );
          return {
            blocks: editorStateRef.current.blocks,
            source: editorStateRef.current.source,
            isUpdated: false,
          };
        }
      }

      // 処理中フラグをrefで管理して状態更新を減らす
      isProcessingRef.current = true;
      console.log(
        `[EditorProvider] ⏳ isProcessingRef を true に設定: ${path}`
      );

      // UIの更新のためにsetStateも使用（ただし頻度を減らす）
      if (!isProcessing) {
        setIsProcessing(true);
        console.log(`[EditorProvider] ⏳ isProcessing を true に設定: ${path}`);
      }

      lastContentFetchTimeRef.current = Date.now();
      lastProcessedPathRef.current = path;
      let isUpdated = false;
      let resultBlocks: BlockNotePackage.Block[] | null = null;
      let resultSource: DataSource | null = null;

      try {
        // 優先度順にデータソースを処理
        const sources: DataSource[] = ["context", "localStorage", "server"];
        let cacheHit = false;

        for (const source of sources) {
          try {
            console.log(
              `[EditorProvider] 🔍 ${source}からデータを取得中: ${path}`
            );

            // サーバーからの取得は、キャッシュヒットがあった場合はスキップ
            if (source === "server" && cacheHit) {
              console.log(
                `[EditorProvider] ⏭️ キャッシュヒットがあるためサーバー取得をスキップ: ${path}`
              );
              continue;
            }

            const data = await fetchSources[source](path);

            if (data.blocks && data.blocks.length > 0) {
              // データの適用判定
              const shouldApply = shouldApplyData(data);
              if (shouldApply) {
                // データの適用
                await applyData(data);
                resultBlocks = data.blocks;
                resultSource = data.source;
                isUpdated = true;
                console.log(
                  `[EditorProvider] ✅ ${source}からのデータを適用: ${path}`,
                  { blocksCount: data.blocks.length }
                );

                // contextまたはlocalStorageからデータが取得できた場合、キャッシュヒットとみなす
                if (source === "context" || source === "localStorage") {
                  cacheHit = true;
                  console.log(
                    `[EditorProvider] 🎯 キャッシュヒット: ${source}からデータを取得: ${path}`
                  );
                }

                break; // 優先度の高いデータが適用されたら終了
              } else {
                console.log(
                  `[EditorProvider] ⏭️ ${source}からのデータは適用されませんでした: ${path}`
                );
              }
            } else {
              console.log(
                `[EditorProvider] ⚠️ ${source}からのデータがありません: ${path}`
              );
            }
          } catch (error) {
            console.error(
              `[EditorProvider] ❌ ${source}からのデータ取得でエラー:`,
              error
            );
          }
        }
      } finally {
        // 処理中フラグをrefで管理して状態更新を減らす
        isProcessingRef.current = false;
        console.log(
          `[EditorProvider] ✅ isProcessingRef を false に設定: ${path}`
        );

        // UIの更新のためにsetStateも使用（ただし頻度を減らす）
        // requestAnimationFrameを使用して複数の更新をバッチ処理
        if (isProcessing) {
          requestAnimationFrame(() => {
            if (isProcessingRef.current === false) {
              setIsProcessing(false);
              console.log(
                `[EditorProvider] ✅ isProcessing を false に設定: ${path}`
              );
            }
          });
        }
      }

      return {
        blocks: resultBlocks || [],
        source: resultSource,
        isUpdated,
      };
    },
    // 依存配列を最小限に抑える
    [fetchSources, shouldApplyData, applyData]
  );

  // getContentRefを作成して参照を安定させる
  const getContentRef = useRef(getContent);

  // getContentRefを更新
  useEffect(() => {
    getContentRef.current = getContent;
  }, [getContent]);

  // 既存のloadContent関数を修正して、getContentRefを使用するように変更
  const loadContent = useCallback(
    async (path: string) => {
      console.log(`[EditorProvider] 📂 loadContent called for path: ${path}`);
      console.log(`[EditorProvider] 🔄 loadContent dependencies:`, {
        getContentRef: !!getContentRef.current,
        getContentIdentity: getContentRef.current.toString().slice(0, 20), // 関数の一部を出力して同一性を確認
      });
      console.log(
        `[EditorProvider] 🔍 loadContent call stack:`,
        new Error().stack
      );

      // パスごとの呼び出し回数を追跡
      const currentCount = pathCallCountMapRef.current.get(path) || 0;
      pathCallCountMapRef.current.set(path, currentCount + 1);
      loadContentCallCountRef.current += 1;

      console.log(
        `[EditorProvider] 📊 loadContent call count for path ${path}: ${
          currentCount + 1
        }`
      );

      const { blocks, source, isUpdated } = await getContentRef.current(path);

      return {
        blocks: blocks || [],
        isUpdated,
        source,
      };
    },
    [] // 依存配列を空にして安定させる
  );

  // 既存のsetCachedBlocks関数を修正
  const setCachedBlocks = useCallback(
    async (path: string, blocks: BlockNotePackage.Block[]) => {
      console.log(
        `[EditorProvider] 📝 setCachedBlocks called for path: ${path}`
      );
      console.log(
        `[EditorProvider] 📊 setCachedBlocks blocks count: ${blocks.length}`
      );

      try {
        // 1. 現在のデータの優先度を確認
        const currentSource = editorStateRef.current.source;
        const currentPriority = editorStateRef.current.priority;

        console.log(`[EditorProvider] 📊 現在のデータ状態:`, {
          source: currentSource,
          priority: currentPriority,
          path,
        });

        // 2. ハッシュの計算
        const newContentHash = hashContent(JSON.stringify(blocks));
        const currentContentHash = lastContentHashRef.current;

        console.log(`[EditorProvider] 🔍 ハッシュ比較:`, {
          currentHash: currentContentHash,
          newHash: newContentHash,
          match: newContentHash === currentContentHash,
        });

        // 3. ハッシュによる差分チェック
        if (newContentHash === currentContentHash) {
          console.log(
            `[EditorProvider] ⏭️ コンテンツに変更がないためスキップ: ${path}`
          );
          // 変更がない場合は成功として扱う
          return true;
        }

        console.log(`[EditorProvider] 🔄 コンテンツの変更を検出:`, {
          oldHash: currentContentHash,
          newHash: newContentHash,
          path,
        });

        // 4. Contextへの保存
        setCachedBlocksState((prev) => {
          const next = new Map(prev);
          next.set(path, blocks);
          return next;
        });

        // 5. LocalStorageへの保存
        try {
          setBlockCache(path, blocks, newContentHash);
          setCacheStats(getCacheStats());
          console.log(`[EditorProvider] ✅ LocalStorageへの保存成功: ${path}`);
        } catch (cacheError) {
          console.error(
            `[EditorProvider] ❌ LocalStorageへの保存失敗:`,
            cacheError
          );
          // LocalStorageへの保存失敗はエラーとして扱わない（続行する）
        }

        // 6. サーバーへの保存
        if (editorRef.current) {
          try {
            const markdownContent =
              await editorRef.current.blocksToMarkdownLossy(blocks);

            // デバッグ用のログ
            console.log(`[EditorProvider] 📄 Markdown変換結果:`, {
              type: typeof markdownContent,
              length: markdownContent?.length,
              preview: markdownContent?.substring(0, 50),
              path,
            });

            if (markdownContent) {
              if (markdownContent.includes("[object Object]")) {
                console.error(
                  `[EditorProvider] ⚠️ 不正なMarkdown変換結果: [object Object]が含まれています`
                );
                return false;
              }

              console.log(`[EditorProvider] 📤 サーバーへの保存開始: ${path}`);
              // 追加デバッグログ - パスの詳細情報
              console.log(`[EditorProvider] 🔍 保存パスの詳細:`, {
                originalPath: path,
                isAbsolute: typeof path === "string" && path.startsWith("/"),
                pathComponents: typeof path === "string" ? path.split("/") : [],
                containsJapanese:
                  typeof path === "string" &&
                  /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(
                    path
                  ),
                envDefaultPath: process.env.NEXT_PUBLIC_DEFAULT_MD_PATH,
              });

              try {
                const result = await saveFile(path, markdownContent);
                // 追加デバッグログ - 保存結果の詳細
                console.log(`[EditorProvider] 📊 保存結果の詳細:`, {
                  success: result.success,
                  error: result.error,
                  path: path,
                });

                if (result.success) {
                  console.log(
                    `[EditorProvider] ✅ サーバーへの保存成功: ${path}`
                  );

                  // 7. 状態の更新
                  lastContentHashRef.current = newContentHash;
                  editorStateRef.current = {
                    blocks,
                    source: "context", // 編集後は常にcontextが最新
                    priority: SOURCE_PRIORITY.context,
                  };

                  return true;
                } else {
                  console.error(
                    `[EditorProvider] ❌ サーバーへの保存失敗:`,
                    result.error
                  );
                  console.error(`[EditorProvider] 🔍 保存失敗の詳細:`, {
                    path,
                    contentLength: markdownContent.length,
                    error: result.error,
                  });
                  return false;
                }
              } catch (saveError) {
                console.error(
                  `[EditorProvider] ❌ サーバー保存中に例外が発生:`,
                  saveError
                );
                console.error(`[EditorProvider] 🔍 例外の詳細:`, {
                  path,
                  errorType:
                    saveError instanceof Error ? "Error" : typeof saveError,
                  errorMessage:
                    saveError instanceof Error
                      ? saveError.message
                      : String(saveError),
                });
                return false;
              }
            } else {
              console.error(
                `[EditorProvider] ❌ Markdownへの変換結果がnullです`
              );
              return false;
            }
          } catch (error) {
            console.error(`[EditorProvider] ❌ Markdown変換でエラー:`, error);
            return false;
          }
        } else {
          console.error(`[EditorProvider] ❌ エディタがnullです`);
          return false;
        }
      } catch (error) {
        console.error(`[EditorProvider] ❌ キャッシュ保存でエラー:`, error);
        return false;
      }
    },
    [editorRef, editorStateRef, setCachedBlocksState, setCacheStats]
  );

  // 既存のclearCachedBlocks関数を修正
  const clearCachedBlocks = useCallback(
    (path: string) => {
      console.log(
        `[EditorProvider] 📝 clearCachedBlocks called for path: ${path}`
      );
      setCachedBlocksState((prev) => {
        const next = new Map(prev);
        next.delete(path);
        return next;
      });
    },
    [setCachedBlocksState]
  );

  // ファイルアップロード処理
  const uploadFile = async (file: File): Promise<string> => {
    try {
      console.log("[EditorProvider] 📤 画像アップロード開始:", file.name);

      // 現在編集中のファイルパスを取得
      const currentPath = lastProcessedPathRef.current;
      if (!currentPath) {
        console.error("[EditorProvider] ❌ 現在のファイルパスが不明です");
        throw new Error("現在のファイルパスが不明です");
      }

      // FormDataの作成
      const formData = new FormData();
      formData.append("file", file);
      formData.append("currentPath", currentPath);

      // 画像アップロードリクエスト
      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[EditorProvider] ❌ 画像アップロード失敗:", errorData);
        throw new Error(errorData.error || "画像のアップロードに失敗しました");
      }

      const result = await response.json();

      // ファイルが既に存在する場合の処理
      if (result.exists) {
        console.log(
          "[EditorProvider] ⚠️ ファイルが既に存在します:",
          result.message
        );

        // ユーザーに確認
        const confirmOverwrite = window.confirm(result.message);

        if (confirmOverwrite) {
          console.log("[EditorProvider] 🔄 ファイルを上書きします");

          // 上書き用のFormDataを作成
          const overwriteFormData = new FormData();
          overwriteFormData.append("file", file);
          overwriteFormData.append("currentPath", currentPath);
          overwriteFormData.append("overwrite", "true");

          // 上書きリクエスト
          const overwriteResponse = await fetch("/api/upload-image", {
            method: "POST",
            body: overwriteFormData,
          });

          if (!overwriteResponse.ok) {
            const errorData = await overwriteResponse.json();
            console.error("[EditorProvider] ❌ 画像上書き失敗:", errorData);
            throw new Error(errorData.error || "画像の上書きに失敗しました");
          }

          const overwriteResult = await overwriteResponse.json();
          console.log("[EditorProvider] ✅ 画像上書き成功:", overwriteResult);

          return overwriteResult.url;
        } else {
          console.log(
            "[EditorProvider] ⏭️ ファイルの上書きをキャンセルしました"
          );
          // 既存のファイルのURLを返す
          return result.url;
        }
      }

      console.log("[EditorProvider] ✅ 画像アップロード成功:", result);

      return result.url;
    } catch (error) {
      console.error("[EditorProvider] ❌ 画像アップロードエラー:", error);
      toast.error("画像のアップロードに失敗しました");
      throw error;
    }
  };

  // エディタの初期化処理
  const editor = useMemo(() => {
    // サーバーサイドでは実行しない
    if (typeof window === "undefined") return null;

    try {
      // 型エラーを回避するため、完全にany型として扱う
      const createEditorOptions: any = {
        uploadFile,
        // 空の初期コンテンツ（最小限のパラグラフ）
        initialContent: [{ type: "paragraph" }],
      };

      // any型を使用して型エラーを回避
      const newEditor = (BlockNotePackage.BlockNoteEditor.create as any)(
        createEditorOptions
      );

      console.log("[EditorProvider] BlockNoteEditor created:", newEditor);

      // エディタをrefに保存
      editorRef.current = newEditor;

      return newEditor;
    } catch (error) {
      console.error(
        "[EditorProvider] エディタの初期化中にエラーが発生しました:",
        error
      );
      setError(error as Error);
      return null;
    }
  }, []);

  // エディタが初期化された後に保留中のマークダウンデータを処理
  useEffect(() => {
    if (!editor || pendingMarkdownRef.current.size === 0) return;

    console.log(
      `[EditorProvider] 保留中のマークダウンデータが${pendingMarkdownRef.current.size}件あります`
    );

    // 非同期で処理するため、setTimeout内で実行
    setTimeout(async () => {
      // Array.fromを使用してMapをエントリーの配列に変換
      const entries = Array.from(pendingMarkdownRef.current.entries());
      for (const [path, markdown] of entries) {
        try {
          console.log(
            `[EditorProvider] 保留中のマークダウンデータを処理: ${path}`
          );

          // エディタインスタンスを使用してマークダウンをパース
          if (typeof editor.tryParseMarkdownToBlocks === "function") {
            const blocks = await (editor as any).tryParseMarkdownToBlocks(
              markdown
            );

            console.log(
              `[EditorProvider] パース成功: ${blocks.length}個のブロック`
            );

            // キャッシュに保存
            setCachedBlocksState((prev) => {
              const next = new Map(prev);
              if (blocks !== null) {
                next.set(path, blocks);
              }
              return next;
            });

            // 処理済みのデータを削除
            pendingMarkdownRef.current.delete(path);
          }
        } catch (error) {
          console.error(
            `[EditorProvider] 保留中のマークダウンデータの処理に失敗: ${path}`,
            error
          );
        }
      }
    }, 0);
  }, [editor]);

  const contextValue: EditorContextType = {
    editor: editorRef.current,
    cachedBlocks,
    setCachedBlocks,
    clearCachedBlocks,
    editorViewRef,
    setEditorOnChange,
    isProcessing,
    cacheStats,
    loadContent,
  };

  return (
    <EditorContext.Provider value={contextValue}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (context === null) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
}
