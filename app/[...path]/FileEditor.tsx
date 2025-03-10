/**
 * FileEditor: 特定のファイルに対するエディタUIとユーザーインタラクションを担当するコンポーネント
 *
 * 責任分担:
 * 1. UI表示とユーザーインタラクション
 *   - BlockNoteViewを使用してエディタUIを表示
 *   - ユーザーの編集操作を処理
 *   - エラー境界を提供し、エディタのクラッシュを防止
 *
 * 2. ファイル固有の状態管理
 *   - 特定のファイルに関連する状態（content, blocks, isSaving）を管理
 *   - ファイルパスの変更を検知し、適切に対応
 *
 * 3. 変更の検知と保存
 *   - エディタの変更イベントをリッスン
 *   - 変更を検知して自動保存をトリガー
 *   - デバウンス処理で保存頻度を最適化
 *
 * EditorContextとの連携:
 *   - useEditorフックを使用してEditorContextにアクセス
 *   - EditorContextが提供する機能（loadContent, editor, setCachedBlocks）を利用
 *   - データの取得・保存・マークダウンパース処理はEditorContextに委譲
 *   - UIと編集体験に集中し、低レベルのデータ処理はEditorContextに任せる
 */

"use client";

import { useCallback, useEffect, useState, useRef, Component } from "react";
import * as BlockNotePackage from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { MantineProvider, createTheme } from "@mantine/core";
import { toast } from "sonner";
import { useEditor } from "@/app/context/EditorContext";
import { debounce } from "lodash";
import { DragDropHandler } from "@/app/components/DragDropHandler";

// 型の別名を定義
type Block = BlockNotePackage.Block;
type BlockNoteEditor = BlockNotePackage.BlockNoteEditor;

// 独自のErrorBoundaryコンポーネント
class ErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] エラーが発生しました:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface FileEditorProps {
  filePath: string;
  initialContent?: string;
}

interface EditorState {
  content: string;
  blocks: Block[];
  isSaving: boolean;
}

export function FileEditor({ filePath, initialContent }: FileEditorProps) {
  const initialState: EditorState = {
    content: initialContent || "",
    blocks: [],
    isSaving: false,
  };

  const [editorState, setEditorState] = useState<EditorState>(initialState);
  const { loadContent, editor, setCachedBlocks, editorViewRef } = useEditor();
  const isMounted = useRef(true);
  const timeoutIdRef = useRef<NodeJS.Timeout>();
  const lastLoadTimeRef = useRef<number>(0);
  const prevFilePathRef = useRef<string>(filePath);
  // 初期ロード中かどうかを示すフラグ
  const isInitialLoadingRef = useRef<boolean>(true);
  // ユーザーによる編集があったかどうかを示すフラグ
  const hasUserEditedRef = useRef<boolean>(false);
  // 最後のロード時間から一定時間経過したかを追跡
  const loadCooldownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // エディタコンテナのref
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // エディタオブジェクトの状態をログに出力
  useEffect(() => {
    console.log("[FileEditor] Editor object:", editor);
    if (editor) {
      console.log("[FileEditor] Editor methods:", Object.keys(editor));
      console.log(
        "[FileEditor] Editor prototype:",
        Object.getPrototypeOf(editor)
      );

      // 詳細なデバッグ情報を追加
      console.log(
        "[FileEditor] Editor constructor name:",
        editor.constructor.name
      );
      // 型エラーを修正 - instanceof演算子は型ではなく値を必要とするため、この行をコメントアウト
      // console.log("[FileEditor] Editor instanceof BlockNoteEditor:", editor instanceof BlockNoteEditor);

      // プロトタイプチェーン全体を調査
      let proto = Object.getPrototypeOf(editor);
      let protoChain = [];
      while (proto) {
        protoChain.push(Object.getOwnPropertyNames(proto));
        proto = Object.getPrototypeOf(proto);
      }
      console.log("[FileEditor] Editor prototype chain:", protoChain);

      // document プロパティの確認
      console.log("[FileEditor] Editor document:", editor.document);

      // topLevelBlocks の代わりに使えるプロパティやメソッドを探す
      if (editor.document) {
        console.log(
          "[FileEditor] Editor document properties:",
          Object.keys(editor.document)
        );
      }

      // Markdownパース関連のメソッドを確認
      const editorAny = editor as any;
      console.log("[FileEditor] Markdown関連メソッドの確認:", {
        hasTryParseMarkdownToBlocks:
          typeof editorAny.tryParseMarkdownToBlocks === "function",
        hasMarkdownToBlocks: typeof editorAny.markdownToBlocks === "function",
        hasParseMarkdown: typeof editorAny.parseMarkdown === "function",
        hasDocumentParseMarkdown:
          editorAny.document &&
          typeof editorAny.document.parseMarkdown === "function",
      });
    }
  }, [editor]);

  // コンポーネントがマウントされたときにprevFilePathRefを更新
  useEffect(() => {
    prevFilePathRef.current = filePath;
  }, [filePath]);

  // エディタの変更イベントを最適化
  const handleEditorChange = useCallback(
    async (editor: BlockNoteEditor) => {
      if (!editor || !filePath) {
        console.warn(
          `[FileEditor] エディタ変更をスキップ: editor=${!!editor}, filePath=${filePath}`
        );
        return;
      }

      // 保存中は処理しない
      if (editorState.isSaving) {
        console.log(`[FileEditor] 保存中のため変更をスキップ: ${filePath}`);
        return;
      }

      // 保存処理を開始
      console.log(`[FileEditor] 保存処理開始: ${filePath}`);
      setEditorState((prev) => ({
        ...prev,
        isSaving: true,
      }));

      try {
        // エディタからブロックを取得
        console.log(`[FileEditor] エディタのプロパティ:`, Object.keys(editor));

        // BlockNote v0.25.1のAPIに合わせてブロックを取得
        const editorAny = editor as any;
        let blocks: any[] = [];

        // 最新のAPI: document.blocksまたはdocument.getBlocksを使用
        if (editorAny.document) {
          if (typeof editorAny.document.getBlocks === "function") {
            // getBlocksメソッドが利用可能な場合
            blocks = editorAny.document.getBlocks();
            console.log(
              `[FileEditor] document.getBlocksからブロック取得: count=${blocks.length}, path=${filePath}`
            );
          } else if (editorAny.document.blocks) {
            // blocksプロパティが利用可能な場合
            blocks = editorAny.document.blocks;
            console.log(
              `[FileEditor] document.blocksからブロック取得: count=${blocks.length}, path=${filePath}`
            );
          } else {
            console.error(
              `[FileEditor] documentオブジェクトからブロックを取得できません: ${filePath}`
            );
          }
        } else {
          console.error(
            `[FileEditor] documentオブジェクトが見つかりません: ${filePath}`
          );
        }

        console.log(
          `[FileEditor] ブロック取得: count=${blocks.length}, path=${filePath}`
        );

        if (blocks.length === 0) {
          console.warn(`[FileEditor] ブロックが空です: ${filePath}`);
          setEditorState((prev) => ({
            ...prev,
            isSaving: false,
          }));
          return;
        }

        // ブロックの内容をログ
        console.log(`[FileEditor] 保存するブロックの詳細:`, {
          count: blocks.length,
          firstBlockType: blocks[0]?.type,
          firstBlockContent: blocks[0]?.content,
          path: filePath,
        });

        // ブロックを保存
        console.log(`[FileEditor] setCachedBlocks呼び出し: ${filePath}`);
        const saveResult = await setCachedBlocks(filePath, blocks);

        if (saveResult) {
          console.log(`[FileEditor] ✅ 保存成功: ${filePath}`);
          setEditorState((prev) => ({
            ...prev,
            isSaving: false,
          }));
        } else {
          console.error(`[FileEditor] ❌ 保存失敗: ${filePath}`);
          console.error(`[FileEditor] 保存失敗の詳細:`, {
            path: filePath,
            blocksCount: blocks.length,
            firstBlockType: blocks[0]?.type,
            editorAvailable: !!editor,
            saveResult,
          });

          // setCachedBlocksの実装を確認
          console.log(
            `[FileEditor] setCachedBlocks関数の型:`,
            typeof setCachedBlocks
          );

          // エディタの状態を確認
          try {
            console.log(`[FileEditor] エディタの状態:`, {
              blocksCount: blocks.length,
              firstBlock: blocks[0],
            });
          } catch (editorError) {
            console.error(`[FileEditor] エディタ状態取得エラー:`, editorError);
          }

          setEditorState((prev) => ({
            ...prev,
            isSaving: false,
          }));
          toast.error("保存に失敗しました");
        }
      } catch (error) {
        console.error(`[FileEditor] 保存処理中に例外が発生:`, error);
        console.error(`[FileEditor] 例外の詳細:`, {
          path: filePath,
          errorType: error instanceof Error ? "Error" : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        });
        setEditorState((prev) => ({
          ...prev,
          isSaving: false,
        }));
        toast.error("保存に失敗しました");
      }
    },
    [filePath, editorState.isSaving, setCachedBlocks]
  );

  // デバウンスされた保存処理
  const debouncedSave = useCallback(
    debounce(() => {
      console.log("[FileEditor] ⏰ Debounced save triggered");

      // エディタがnullの場合は処理しない
      if (!editor) {
        console.warn(
          "[FileEditor] ⚠️ エディタがnullのため保存をスキップします"
        );
        return;
      }

      // 保存処理を実行
      handleEditorChange(editor).catch((error) => {
        console.error("[FileEditor] 🚨 Error in debounced save:", error);
      });
    }, 2000), // 保存間隔を短くする
    [handleEditorChange, editor]
  );

  // エディタの変更を検知して保存をトリガー
  useEffect(() => {
    if (!editor) return;

    const onChange = () => {
      console.log("[FileEditor] 📝 Editor content changed");

      // 初期ロード中の場合は処理をスキップ
      if (isInitialLoadingRef.current) {
        console.log(
          "[FileEditor] ⏭️ 初期ロード中の変更イベントをスキップします"
        );
        return;
      }

      // ユーザーによる編集があったことをマーク
      hasUserEditedRef.current = true;
      console.log("[FileEditor] ✏️ ユーザーによる編集を検出しました");

      // 保存処理をトリガー
      debouncedSave();
    };

    // エディタの変更イベントをリッスン
    try {
      if (editor) {
        // BlockNote v0.25.1のAPI: onEditorContentChangeを使用
        // any型を使用して型エラーを回避
        const editorAny = editor as any;
        if (typeof editorAny.onEditorContentChange === "function") {
          editorAny.onEditorContentChange(onChange);
          console.log(
            "[FileEditor] onEditorContentChangeリスナーを設定しました"
          );
        } else {
          console.error(
            "[FileEditor] 変更イベントを監視するメソッドが見つかりません"
          );
        }
      } else {
        console.error("[FileEditor] エディタオブジェクトが存在しません");
      }
    } catch (error) {
      console.error("[FileEditor] エディタの変更イベント設定エラー:", error);
    }

    // クリーンアップ関数
    return () => {
      console.log("[FileEditor] 🧹 Cleaning up editor change listener");
      // 変更リスナーを削除（BlockNoteEditorの仕様に合わせて修正）
      // 注: BlockNoteEditorにはリスナー削除用のメソッドがないため、
      // 代わりにdebouncedSaveをflushして保留中の保存を実行

      // 保存が保留中の場合は即時実行
      if (debouncedSave.flush) {
        console.log("[FileEditor] 🔄 Flushing pending saves before unmount");
        debouncedSave.flush();
      }

      // タイムアウトをクリア
      if (loadCooldownTimeoutRef.current) {
        clearTimeout(loadCooldownTimeoutRef.current);
      }
    };
  }, [editor, debouncedSave]);

  // コンテンツの読み込み
  useEffect(() => {
    console.log("[FileEditor] 🔄 loadData useEffect triggered", {
      filePath,
      loadContentChanged: !!loadContent,
      loadContentIdentity: loadContent
        ? loadContent.toString().slice(0, 20)
        : null,
    });

    // loadContentの参照を保存
    const currentLoadContent = loadContent;

    // 同じパスに対する短時間での再読み込みを防止
    if (prevFilePathRef.current === filePath) {
      const timeSinceLastLoad = Date.now() - (lastLoadTimeRef.current || 0);
      if (timeSinceLastLoad < 5000) {
        // 5秒以内の再読み込みはスキップ
        console.log(
          `[FileEditor] ⏭️ 短時間での再読み込みをスキップ: ${filePath}, 前回の読み込みから ${timeSinceLastLoad}ms`
        );
        return;
      }
    }

    // 読み込み時間を記録
    lastLoadTimeRef.current = Date.now();
    prevFilePathRef.current = filePath;

    // 初期ロード中フラグを設定
    isInitialLoadingRef.current = true;
    console.log("[FileEditor] 🔄 初期ロード中フラグをONにしました");

    // ユーザー編集フラグをリセット
    hasUserEditedRef.current = false;

    const loadData = async () => {
      try {
        console.log(
          `[FileEditor] loadData: コンテンツ読み込み開始: ${filePath}`
        );
        const { blocks, isUpdated, source } = await currentLoadContent(
          filePath
        );
        console.log(`[FileEditor] loadData: コンテンツ読み込み結果:`, {
          blocksCount: blocks?.length || 0,
          isUpdated,
          source,
          hasBlocks: !!blocks && blocks.length > 0,
          firstBlock:
            blocks?.length > 0
              ? JSON.stringify(blocks[0]).substring(0, 100) + "..."
              : null,
        });

        if (!isMounted.current) return;

        // ブロックが空の場合でも処理を続行
        if (!blocks || blocks.length === 0) {
          console.log(
            `[FileEditor] ⚠️ ブロックが空です。空のエディタを表示します。`
          );
          // 空のブロックを設定
          setEditorState((prev) => ({
            ...prev,
            blocks: [],
          }));
        } else {
          console.log(
            `[FileEditor] ✅ ${blocks.length}個のブロックを設定します`
          );
          // ブロックがある場合は通常通り設定
          setEditorState((prev) => ({
            ...prev,
            blocks,
          }));
        }

        // ロード完了後、少し待ってから初期ロードフラグをOFFにする
        // これにより、ロード直後の自動変更イベントと実際のユーザー編集を区別できる
        if (loadCooldownTimeoutRef.current) {
          clearTimeout(loadCooldownTimeoutRef.current);
        }

        loadCooldownTimeoutRef.current = setTimeout(() => {
          isInitialLoadingRef.current = false;
          console.log("[FileEditor] 🔄 初期ロード中フラグをOFFにしました");
        }, 500); // 500ms待機

        if (isUpdated) {
          toast.info(`新しいバージョンが ${source} から読み込まれました`);
        } else if (source) {
          toast.success(`${source} からコンテンツを読み込みました`);
        }
      } catch (error) {
        console.error("[FileEditor] Error loading content:", error);
        if (isMounted.current) {
          toast.error("コンテンツの読み込みに失敗しました");
          // エラー時も空のエディタを表示
          setEditorState((prev) => ({
            ...prev,
            blocks: [],
          }));
        }
      }
    };

    loadData();

    return () => {
      isMounted.current = false;
      if (loadCooldownTimeoutRef.current) {
        clearTimeout(loadCooldownTimeoutRef.current);
      }
    };
  }, [filePath]); // loadContentを依存配列から削除

  // EditorContextに委譲したマークダウンパース処理を利用
  useEffect(() => {
    if (editor && filePath) {
      console.log("[FileEditor] 🔄 コンテンツ読み込み処理を開始します");

      const loadInitialContent = async () => {
        try {
          // EditorContextのloadContent関数を使用してデータを取得
          // （内部でマークダウンパース処理が実行される）
          const { blocks, isUpdated, source } = await loadContent(filePath);

          console.log("[FileEditor] コンテンツ読み込み結果:", {
            hasBlocks: !!blocks && blocks.length > 0,
            blocksCount: blocks?.length || 0,
            source,
            isUpdated,
          });

          if (blocks && blocks.length > 0) {
            console.log(
              "[FileEditor] ✅ 初期Markdownデータのパースに成功しました",
              {
                blocksCount: blocks.length,
                source,
                firstBlock:
                  blocks.length > 0
                    ? JSON.stringify(blocks[0]).substring(0, 100) + "..."
                    : null,
              }
            );

            // エディタに適用
            const editorAny = editor as any;
            if (
              typeof editorAny.replaceBlocks === "function" &&
              editorAny.document
            ) {
              console.log(
                "[FileEditor] 🔄 初期Markdownデータをエディタに適用します"
              );

              // BlockNote.jsの公式APIに従って実装
              editorAny.replaceBlocks(editorAny.document, blocks);
              console.log(
                "[FileEditor] ✅ 初期Markdownデータをエディタに適用しました"
              );
            } else {
              console.warn(
                "[FileEditor] ⚠️ replaceBlocksメソッドまたはdocumentプロパティが見つかりません"
              );
            }
          } else {
            console.warn(
              "[FileEditor] ⚠️ 初期Markdownデータのパース結果が空です"
            );
          }
        } catch (error) {
          console.error(
            "[FileEditor] ❌ 初期Markdownデータのパースに失敗:",
            error
          );
        }
      };

      // 初期Markdownデータをパース
      loadInitialContent();
    }
  }, [editor, filePath, loadContent]);

  // Markdown変換関数
  const convertToMarkdown = useCallback(
    async (blocks: Block[]) => {
      if (!editor) {
        console.warn("[FileEditor] エディタがnullのため変換をスキップします");
        return;
      }

      if (!blocks || blocks.length === 0) {
        console.warn("[FileEditor] ブロックが空のため変換をスキップします");
        return;
      }

      try {
        // editorをany型として扱い、型エラーを回避
        const editorAny = editor as any;

        // BlockNote.jsの公式APIを使用: blocksToMarkdownLossy
        if (typeof editorAny.blocksToMarkdownLossy === "function") {
          const markdown = await editorAny.blocksToMarkdownLossy(blocks);
          setEditorState((prev) => ({
            ...prev,
            content: markdown,
          }));
          console.log("[FileEditor] blocksToMarkdownLossyで変換しました");
        } else {
          console.error(
            "[FileEditor] blocksToMarkdownLossyメソッドが見つかりません"
          );
        }
      } catch (error) {
        console.error(
          "[FileEditor] Error converting blocks to markdown:",
          error
        );
      }
    },
    [editor]
  );

  // ブロックの変更を監視
  useEffect(() => {
    convertToMarkdown(editorState.blocks);
  }, [editorState.blocks, convertToMarkdown]);

  // 追加: エディタマウント後にブロックを適用する処理
  useEffect(() => {
    if (editor && editorViewRef.current) {
      console.log("[FileEditor] 🔄 エディタがマウントされました");

      // エディタがマウントされた後、少し待ってからブロックを適用
      const timer = setTimeout(() => {
        if (editorState.blocks && editorState.blocks.length > 0) {
          try {
            console.log("[FileEditor] 🔄 マウント後のブロック適用を試みます", {
              blocksCount: editorState.blocks.length,
            });

            const editorAny = editor as any;
            // BlockNote v0.25.1のAPI: replaceBlocksメソッドを使用
            if (
              typeof editorAny.replaceBlocks === "function" &&
              editorAny.document
            ) {
              // 公式APIに従って実装
              editorAny.replaceBlocks(editorAny.document, editorState.blocks);
              console.log(
                "[FileEditor] ✅ マウント後のブロック適用に成功しました"
              );
            }
            // 代替手段: document.replaceBlocksを試す
            else if (
              editorAny.document &&
              typeof editorAny.document.replaceBlocks === "function"
            ) {
              editorAny.document.replaceBlocks(editorState.blocks);
              console.log(
                "[FileEditor] ✅ document.replaceBlocksでブロック適用に成功しました"
              );
            } else {
              console.warn(
                "[FileEditor] ⚠️ ブロックを適用するメソッドが見つかりません"
              );
            }
          } catch (error) {
            console.error(
              "[FileEditor] ❌ マウント後のブロック適用に失敗:",
              error
            );
          }
        } else {
          // ブロックが空の場合、サーバーから再取得を試みる
          console.log(
            "[FileEditor] 🔄 ブロックが空のため、サーバーから再取得を試みます"
          );

          const fetchData = async () => {
            try {
              const { blocks, isUpdated, source } = await loadContent(filePath);

              if (blocks && blocks.length > 0) {
                console.log(
                  "[FileEditor] ✅ サーバーからのデータ取得に成功しました",
                  {
                    blocksCount: blocks.length,
                    source,
                  }
                );

                const editorAny = editor as any;
                if (
                  typeof editorAny.replaceBlocks === "function" &&
                  editorAny.document
                ) {
                  editorAny.replaceBlocks(editorAny.document, blocks);
                  console.log(
                    "[FileEditor] ✅ サーバーから取得したブロックを適用しました"
                  );
                }
              }
            } catch (error) {
              console.error(
                "[FileEditor] ❌ サーバーからのデータ取得に失敗:",
                error
              );
            }
          };

          fetchData();
        }
      }, 1000); // 1秒待機

      return () => clearTimeout(timer);
    }
  }, [
    editor,
    editorViewRef.current,
    editorState.blocks,
    filePath,
    loadContent,
  ]);

  if (!editor) {
    console.warn("[FileEditor] エディタがnullです");
    return <div className="editor-loading">エディタを読み込み中...</div>;
  }

  console.log("[FileEditor] Rendering BlockNoteView with editor:", editor);
  console.log("[FileEditor] Editor view ref:", editorViewRef);

  // エディタのメソッドが存在するか確認
  const editorMethods = Object.keys(editor);
  console.log("[FileEditor] Checking for topLevelBlocks method:", {
    methods: editorMethods,
    hasTopLevelBlocks: editorMethods.includes("topLevelBlocks"),
    hasDocument: editorMethods.includes("document"),
    documentType: editor.document ? typeof editor.document : "undefined",
  });

  // editorをany型として扱い、型エラーを回避
  const editorAny = editor as any;

  // BlockNoteViewをレンダリング
  return (
    <DragDropHandler>
      <div className="editor-container" ref={editorContainerRef}>
        <MantineProvider theme={createTheme({})} defaultColorScheme="light">
          <ErrorBoundary
            fallback={
              <div className="editor-error">
                エディタのレンダリングに失敗しました
              </div>
            }
          >
            {/* デバッグ情報を表示
            <div
              className="debug-info"
              style={{
                fontSize: "12px",
                padding: "5px",
                background: "#f5f5f5",
                display: "block",
              }}
            >
              <div>ブロック数: {editorState.blocks?.length || 0}</div>
              <div>ファイルパス: {filePath}</div>
              <div>
                初期ロード完了: {isInitialLoadingRef.current ? "No" : "Yes"}
              </div>
              <div>
                エディタメソッド:{" "}
                {editor
                  ? Object.keys(editor).join(", ").substring(0, 100) + "..."
                  : "なし"}
              </div>
              <div>
                最初のブロック:{" "}
                {editorState.blocks?.length > 0
                  ? JSON.stringify(editorState.blocks[0]).substring(0, 100) +
                    "..."
                  : "なし"}
              </div>
              <div>
                BlockNoteView ref: {editorViewRef.current ? "あり" : "なし"}
              </div>
              <div>
                <button
                  onClick={() => {
                    // デバッグ用: ローカルストレージをクリア
                    localStorage.clear();
                    window.location.reload();
                  }}
                  style={{ padding: "2px 5px", fontSize: "10px" }}
                >
                  キャッシュクリア
                </button>
                <button
                  onClick={() => {
                    // デバッグ用: ブロックを明示的に適用
                    if (
                      editor &&
                      editorState.blocks &&
                      editorState.blocks.length > 0
                    ) {
                      try {
                        const editorAny = editor as any;
                        console.log(
                          "[FileEditor] 🔍 ブロック適用ボタンクリック:",
                          {
                            editorExists: !!editorAny,
                            hasReplaceBlocks:
                              typeof editorAny.replaceBlocks === "function",
                            hasDocument: !!editorAny.document,
                            blocksCount: editorState.blocks.length,
                            firstBlock:
                              JSON.stringify(editorState.blocks[0]).substring(
                                0,
                                100
                              ) + "...",
                          }
                        );

                        if (
                          typeof editorAny.replaceBlocks === "function" &&
                          editorAny.document
                        ) {
                          // BlockNote.jsの公式APIに従って実装
                          editorAny.replaceBlocks(
                            editorAny.document,
                            editorState.blocks
                          );
                          console.log(
                            "[FileEditor] ✅ ブロック適用ボタン: ブロックを適用しました"
                          );

                          alert("ブロックを適用しました");
                        } else {
                          console.error(
                            "[FileEditor] ❌ ブロック適用ボタン: replaceBlocksまたはdocumentが見つかりません"
                          );
                          alert(
                            "replaceBlocksメソッドまたはdocumentプロパティが見つかりません"
                          );
                        }
                      } catch (error) {
                        console.error(
                          "[FileEditor] ❌ ブロック適用ボタン: エラー発生",
                          error
                        );
                        alert(
                          "エラー: " +
                            (error instanceof Error
                              ? error.message
                              : String(error))
                        );
                      }
                    } else {
                      console.warn(
                        "[FileEditor] ⚠️ ブロック適用ボタン: 条件を満たしていません",
                        {
                          hasEditor: !!editor,
                          hasBlocks: !!editorState.blocks,
                          blocksLength: editorState.blocks?.length || 0,
                        }
                      );
                      alert("エディタまたはブロックデータがありません");
                    }
                  }}
                  style={{
                    padding: "2px 5px",
                    fontSize: "10px",
                    marginLeft: "5px",
                  }}
                >
                  ブロック適用
                </button>
              </div>
            </div> */}

            <BlockNoteView
              editor={editor}
              ref={editorViewRef}
              editable={true}
            />
          </ErrorBoundary>
        </MantineProvider>
        <style jsx>{`
          .editor-container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            position: relative;
          }
        `}</style>
      </div>
    </DragDropHandler>
  );
}
