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

type DataSource = "server" | "localStorage" | "context";

interface SourceData {
  source: DataSource;
  blocks: BlockNotePackage.Block[] | null;
  error?: string | null;
  path: string;
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
  convertToMarkdown: (
    blocks: BlockNotePackage.Block[]
  ) => Promise<string | null>;
}

const EditorContext = createContext<EditorContextType | null>(null);

interface EditorProviderProps {
  children: React.ReactNode;
}

// ハッシュ関数の定義
const hashContent = (content: string): string => {
  return createHash("sha256").update(content).digest("hex").slice(0, 8);
};

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

          if (result.success) {
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

            // エディタが初期化されている場合はパースを試みる
            if (editorRef.current) {
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

                  if (blocks && blocks.length > 0) {
                    // ハッシュの計算
                    const newContentHash = hashContent(JSON.stringify(blocks));

                    // 取得したデータをContextに保存
                    setCachedBlocksState((prev) => {
                      const next = new Map(prev);
                      next.set(path, blocks);
                      return next;
                    });

                    // LocalStorageにも保存
                    try {
                      setBlockCache(path, blocks, newContentHash);
                      setCacheStats(getCacheStats());
                      console.log(
                        `[EditorContext] 📍Server: データをLocalStorageに保存しました`
                      );
                    } catch (cacheError) {
                      console.error(
                        `[EditorContext] ❌ LocalStorageへの保存失敗:`,
                        cacheError
                      );
                    }

                    // ハッシュ値を更新
                    lastContentHashRef.current = newContentHash;

                    console.log(
                      `[EditorContext] 📍Server: 取得したデータをキャッシュに保存しました`
                    );

                    // エディタの状態を更新
                    editorStateRef.current = {
                      blocks,
                      source: "server",
                      priority: SOURCE_PRIORITY.server,
                    };

                    return { source: "server", blocks, path };
                  }
                } else {
                  console.error(
                    "[EditorProvider] 📍Server: tryParseMarkdownToBlocksメソッドが見つかりません"
                  );
                }
              } catch (parseError) {
                console.error(
                  "[EditorContext] ❌Server: パース失敗",
                  parseError
                );
              }
            }

            // エディタが初期化されていない場合、またはパースに失敗した場合
            console.log(
              "[EditorContext] ⚠️Server: editorRefがnullですが、マークダウンデータは取得できています"
            );

            // マークダウンデータを一時保存
            pendingMarkdownRef.current.set(path, result.data);
            console.log(
              `[EditorContext] 📍Server: マークダウンデータを一時保存しました: ${path}`
            );

            // 空ではないブロック配列を返す（エディタ表示のため）
            // 型エラーを避けるため、空の配列を使用
            const initialBlocks: BlockNotePackage.Block[] = [];

            return {
              source: "server",
              blocks: initialBlocks,
              path,
            };
          }

          return {
            source: "server",
            blocks: null,
            error: result.error || "サーバーからのデータ取得に失敗しました",
            path,
          };
        } catch (error) {
          console.error("[EditorContext] ❌Server: データ取得エラー", error);
          return {
            source: "server",
            blocks: null,
            error: error instanceof Error ? error.message : "データ取得エラー",
            path,
          };
        }
      },
    };
    return sources;
  }, [cachedBlocks, editorRef]);

  // getContent関数を修正して、同時並行でデータを取得するように変更
  const getContent = useCallback(
    async (path: string) => {
      console.log(`[EditorProvider] 🔍 getContent called for path: ${path}`);
      console.log(`[EditorProvider] 🔄 getContent dependencies:`, {
        isProcessing: isProcessing,
        fetchSourcesRef: !!fetchSources,
        shouldApplyDataRef: !!shouldApplyData,
        applyDataRef: !!applyData,
      });

      // 処理中フラグを設定
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
      let resultBlocks: BlockNotePackage.Block[] | null = null;
      let resultSource: DataSource | null = null;
      let isUpdated = false;

      try {
        // 優先度の定義（高いほど優先）
        const PRIORITY: Record<DataSource, number> = {
          server: 3, // サーバーが最優先
          context: 2, // 次にコンテキスト
          localStorage: 1, // 最後にローカルストレージ
        };

        // 同時並行でデータを取得
        const sources: DataSource[] = ["context", "localStorage", "server"];
        const fetchPromises = sources.map((source) => {
          return new Promise<SourceData | null>(async (resolve) => {
            try {
              console.log(
                `[EditorProvider] 🔍 ${source}からデータを取得中: ${path}`
              );
              const data = await fetchSources[source](path);
              if (data.blocks && data.blocks.length > 0) {
                console.log(
                  `[EditorProvider] ✅ ${source}からデータを取得しました: ${path}`,
                  {
                    blocksCount: data.blocks.length,
                    priority: PRIORITY[source],
                  }
                );
                resolve(data);
              } else {
                console.log(
                  `[EditorProvider] ⚠️ ${source}からのデータがありません: ${path}`
                );
                resolve(null);
              }
            } catch (error) {
              console.error(
                `[EditorProvider] ❌ ${source}からの取得エラー:`,
                error
              );
              resolve(null);
            }
          });
        });

        // 取得結果を格納する配列
        const results: (SourceData | null)[] = [];

        // 取得できたデータを順次処理
        for (const promise of fetchPromises) {
          const result = await promise;
          if (result) {
            results.push(result);

            // まだエディタに反映されていない場合は、取得できたデータを即時反映
            if (!resultBlocks) {
              const shouldApply = shouldApplyData(result);
              if (shouldApply && result.blocks) {
                await applyData(result);
                resultBlocks = result.blocks;
                resultSource = result.source;
                isUpdated = true;
                console.log(
                  `[EditorProvider] 🔄 最初のデータをエディタに反映: ${result.source}`,
                  {
                    blocksCount: result.blocks?.length || 0,
                  }
                );
              }
            }
          }
        }

        // 優先度順にソート（降順）
        results.sort((a, b) => {
          if (!a) return 1;
          if (!b) return -1;
          return PRIORITY[b.source] - PRIORITY[a.source];
        });

        // 最も優先度の高いデータを適用
        if (results.length > 0 && results[0]) {
          const highestPriorityData = results[0];

          // 既に適用されたデータと異なる場合のみ上書き
          if (resultSource !== highestPriorityData.source) {
            const shouldApply = shouldApplyData(highestPriorityData);
            if (shouldApply && highestPriorityData.blocks) {
              await applyData(highestPriorityData);
              resultBlocks = highestPriorityData.blocks;
              resultSource = highestPriorityData.source;
              isUpdated = true;
              console.log(
                `[EditorProvider] 🔄 優先度の高いデータで上書き: ${highestPriorityData.source}`,
                {
                  blocksCount: highestPriorityData.blocks?.length || 0,
                  priority: PRIORITY[highestPriorityData.source],
                }
              );
            }
          }
        }
      } catch (error) {
        console.error(`[EditorProvider] ❌ データ取得中にエラー:`, error);
      } finally {
        // 処理中フラグを解除
        isProcessingRef.current = false;
        console.log(
          `[EditorProvider] ✅ isProcessingRef を false に設定: ${path}`
        );

        // UIの更新のためにsetStateも使用（ただし頻度を減らす）
        if (isProcessing) {
          setIsProcessing(false);
          console.log(
            `[EditorProvider] ✅ isProcessing を false に設定: ${path}`
          );
        }
      }

      // 結果を返す
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

  // convertToMarkdown関数を追加
  const convertToMarkdown = useCallback(
    async (blocks: BlockNotePackage.Block[]): Promise<string | null> => {
      if (!editorRef.current) {
        console.warn(
          "[EditorProvider] エディタがnullのため変換をスキップします"
        );
        return null;
      }

      if (!blocks || blocks.length === 0) {
        console.warn("[EditorProvider] ブロックが空のため変換をスキップします");
        return null;
      }

      try {
        // editorをany型として扱い、型エラーを回避
        const editorAny = editorRef.current as any;

        // 画像ブロックの検出
        const hasImageBlocks = blocks.some((block) => block.type === "image");
        console.log("[EditorProvider] 画像ブロックの有無:", hasImageBlocks);

        // BlockNote.jsの公式APIを使用: blocksToMarkdownLossy
        if (typeof editorAny.blocksToMarkdownLossy === "function") {
          let markdown = await editorAny.blocksToMarkdownLossy(blocks);

          // 画像ブロックの処理
          if (hasImageBlocks) {
            console.log(
              "[EditorProvider] 画像ブロックを含むMarkdownに変換します"
            );

            // 画像ブロックのMarkdown生成
            const imageMarkdown = blocks
              .filter(
                (block) =>
                  block.type === "image" &&
                  block.props &&
                  (block.props as any).url
              )
              .map((block) => `\n![image](${(block.props as any).url})\n\n`)
              .join("");

            // 既存のMarkdownに画像Markdownを追加
            if (imageMarkdown) {
              markdown += "\n" + imageMarkdown;
            }
          }

          console.log("[EditorProvider] blocksToMarkdownLossyで変換しました");
          return markdown;
        } else {
          console.error(
            "[EditorProvider] blocksToMarkdownLossyメソッドが見つかりません"
          );
          return null;
        }
      } catch (error) {
        console.error(
          "[EditorProvider] Error converting blocks to markdown:",
          error
        );
        return null;
      }
    },
    []
  );

  // エディタの初期化処理
  const initEditor = useMemo(() => {
    // サーバーサイドでは実行しない
    if (typeof window === "undefined") return null;

    try {
      console.log("[EditorProvider] エディタの初期化を開始します");

      // 型エラーを回避するため、完全にany型として扱う
      const createEditorOptions: any = {
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
    if (!initEditor || pendingMarkdownRef.current.size === 0) return;

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
          if (typeof initEditor.tryParseMarkdownToBlocks === "function") {
            const blocks = await (initEditor as any).tryParseMarkdownToBlocks(
              markdown
            );

            console.log(
              `[EditorProvider] パース成功: ${blocks.length}個のブロック`
            );

            if (blocks && blocks.length > 0) {
              // ハッシュの計算
              const newContentHash = hashContent(JSON.stringify(blocks));

              // キャッシュに保存
              setCachedBlocksState((prev) => {
                const next = new Map(prev);
                next.set(path, blocks);
                return next;
              });

              // LocalStorageにも保存
              try {
                setBlockCache(path, blocks, newContentHash);
                setCacheStats(getCacheStats());
                console.log(
                  `[EditorProvider] LocalStorageにデータを保存しました: ${path}`
                );
              } catch (cacheError) {
                console.error(
                  `[EditorProvider] ❌ LocalStorageへの保存失敗:`,
                  cacheError
                );
              }

              // ハッシュ値を更新
              lastContentHashRef.current = newContentHash;

              // エディタの状態を更新
              editorStateRef.current = {
                blocks,
                source: "server",
                priority: SOURCE_PRIORITY.server,
              };

              console.log(
                `[EditorProvider] 保留中のデータの処理が完了しました: ${path}`
              );
            }

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
  }, [initEditor]);

  // setCachedBlocks関数を追加
  const setCachedBlocks = useCallback(
    async (
      path: string,
      blocks: BlockNotePackage.Block[]
    ): Promise<boolean> => {
      console.log(
        `[EditorProvider] 📝 setCachedBlocks called for path: ${path}`
      );

      try {
        // ブロックが空の場合は、エディタから現在のブロックを取得
        if (!blocks || blocks.length === 0) {
          if (!editorRef.current) {
            console.warn(
              "[EditorProvider] エディタがnullのため処理をスキップします"
            );
            return false;
          }

          // エディタからブロックを取得
          const editorAny = editorRef.current as any;
          let currentBlocks: BlockNotePackage.Block[] = [];

          // 複数の方法でブロックの取得を試みる
          if (editorAny.document) {
            // 方法1: document配列を直接使用
            if (Array.isArray(editorAny.document)) {
              currentBlocks = editorAny.document;
            }
            // 方法2: document.getTopLevelBlocks()を使用
            else if (
              typeof editorAny.document.getTopLevelBlocks === "function"
            ) {
              currentBlocks = editorAny.document.getTopLevelBlocks();
            }
            // 方法3: document.getBlocks()を使用
            else if (typeof editorAny.document.getBlocks === "function") {
              currentBlocks = editorAny.document.getBlocks();
            }
            // 方法4: document.blocksを使用
            else if (editorAny.document.blocks) {
              currentBlocks = editorAny.document.blocks;
            }
          }
          // 方法5: getContent()メソッドを使用
          else if (typeof editorAny.getContent === "function") {
            currentBlocks = editorAny.getContent();
          }

          if (currentBlocks.length === 0) {
            console.warn("[EditorProvider] ブロックが取得できませんでした");
            return false;
          }

          blocks = currentBlocks;
        }

        console.log(
          `[EditorProvider] 📊 setCachedBlocks blocks count: ${blocks.length}`
        );

        // ハッシュの計算
        const newContentHash = hashContent(JSON.stringify(blocks));
        const currentContentHash = lastContentHashRef.current;

        // ハッシュによる差分チェック
        if (newContentHash === currentContentHash) {
          console.log(
            `[EditorProvider] ⏭️ コンテンツに変更がないためスキップ: ${path}`
          );
          // 変更がない場合は成功として扱う
          return true;
        }

        // Contextへの保存
        setCachedBlocksState((prev) => {
          const next = new Map(prev);
          next.set(path, blocks);
          return next;
        });

        // LocalStorageへの保存
        try {
          setBlockCache(path, blocks, newContentHash);
          setCacheStats(getCacheStats());
        } catch (cacheError) {
          console.error(
            `[EditorProvider] ❌ LocalStorageへの保存失敗:`,
            cacheError
          );
          // LocalStorageへの保存失敗はエラーとして扱わない（続行する）
        }

        // サーバーへの保存
        if (editorRef.current) {
          try {
            // Markdownに変換
            const markdown = await convertToMarkdown(blocks);

            if (markdown) {
              // サーバーに保存
              const result = await saveFile(path, markdown);

              if (result.success) {
                // 状態の更新
                lastContentHashRef.current = newContentHash;
                return true;
              } else {
                console.error(
                  `[EditorProvider] ❌ サーバーへの保存失敗:`,
                  result.error
                );
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
    [convertToMarkdown]
  );

  // clearCachedBlocks関数を追加
  const clearCachedBlocks = useCallback((path: string) => {
    console.log(
      `[EditorProvider] 📝 clearCachedBlocks called for path: ${path}`
    );
    setCachedBlocksState((prev) => {
      const next = new Map(prev);
      next.delete(path);
      return next;
    });
  }, []);

  const contextValue: EditorContextType = {
    editor: initEditor,
    cachedBlocks,
    setCachedBlocks,
    clearCachedBlocks,
    editorViewRef,
    setEditorOnChange,
    isProcessing,
    cacheStats,
    loadContent,
    convertToMarkdown,
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
