/**
 * FileEditor: メインのエディタコンポーネント
 *
 * BlockNoteWrapperとの違い：
 * 1. BlockNoteViewを直接使用し、余分なラッパーを削除
 * 2. より単純な状態管理（editorStateのみ）
 * 3. 自動保存のロジックをシンプル化
 * 4. コンテンツのローディング状態を明示的に管理
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

        // editorをany型として扱い、型エラーを回避
        const editorAny = editor as any;

        // topLevelBlocksが存在するか確認し、存在しない場合は代替手段を使用
        let blocks: any[] = [];
        if ("topLevelBlocks" in editorAny) {
          blocks = editorAny.topLevelBlocks;
          console.log(
            `[FileEditor] topLevelBlocksからブロック取得: count=${blocks.length}, path=${filePath}`
          );
        } else if (
          editorAny.document &&
          typeof editorAny.document === "object" &&
          "blocks" in editorAny.document
        ) {
          blocks = editorAny.document.blocks;
          console.log(
            `[FileEditor] document.blocksからブロック取得: count=${blocks.length}, path=${filePath}`
          );
        } else {
          console.error(`[FileEditor] ブロックを取得できません: ${filePath}`);

          // 代替手段を探す
          console.log(`[FileEditor] 代替手段を探します`);

          // documentプロパティを確認
          if (editorAny.document) {
            console.log(`[FileEditor] document:`, editorAny.document);
            console.log(
              `[FileEditor] documentのプロパティ:`,
              Object.keys(editorAny.document)
            );

            // blocksプロパティがあるか確認
            if (
              typeof editorAny.document === "object" &&
              "blocks" in editorAny.document
            ) {
              console.log(
                `[FileEditor] document.blocksを発見:`,
                editorAny.document.blocks
              );
              blocks = editorAny.document.blocks;
            }
          }

          if (blocks.length === 0) {
            setEditorState((prev) => ({
              ...prev,
              isSaving: false,
            }));
            return;
          }
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
      if (editor && typeof editor.onEditorContentChange === "function") {
        editor.onEditorContentChange(onChange);
      } else {
        console.error(
          "[FileEditor] エディタまたはonEditorContentChangeメソッドが存在しません"
        );
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
        const { blocks, isUpdated, source } = await currentLoadContent(
          filePath
        );

        if (!isMounted.current) return;

        setEditorState((prev) => ({
          ...prev,
          blocks,
        }));

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

        // blocksToMarkdownLossyメソッドが存在するか確認
        if (typeof editorAny.blocksToMarkdownLossy === "function") {
          const markdown = await editorAny.blocksToMarkdownLossy(blocks);
          setEditorState((prev) => ({
            ...prev,
            content: markdown,
          }));
        } else {
          console.error(
            "[FileEditor] blocksToMarkdownLossyメソッドが存在しません"
          );
          throw new Error("blocksToMarkdownLossyメソッドが見つかりません");
        }
      } catch (error) {
        console.error(
          "[FileEditor] Error converting blocks to markdown:",
          error
        );
        // エラー時にはシンプルな変換を試みる
        try {
          const simpleMarkdown = blocks
            .map((block) => {
              if (block.content) {
                // contentの型に応じて処理を分ける
                if (Array.isArray(block.content)) {
                  return block.content
                    .filter((c) => c && typeof c === "object" && "text" in c)
                    .map((c) => (c as any).text || "")
                    .join("");
                } else if (
                  typeof block.content === "object" &&
                  block.content !== null
                ) {
                  // オブジェクトの場合は文字列に変換を試みる
                  return String(block.content);
                }
              }
              return "";
            })
            .join("\n\n");

          setEditorState((prev) => ({
            ...prev,
            content: simpleMarkdown,
          }));
        } catch (fallbackError) {
          console.error(
            "[FileEditor] フォールバック変換にも失敗:",
            fallbackError
          );
        }
      }
    },
    [editor]
  );

  // ブロックの変更を監視
  useEffect(() => {
    convertToMarkdown(editorState.blocks);
  }, [editorState.blocks, convertToMarkdown]);

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

  // topLevelBlocksが存在しない場合は代替手段を使用
  if (!editorMethods.includes("topLevelBlocks")) {
    console.error("[FileEditor] エディタにtopLevelBlocksメソッドがありません");

    // document.blocksが存在するか確認
    if (editorAny.document && typeof editorAny.document === "object") {
      console.log("[FileEditor] document.blocksを使用します");

      // documentオブジェクトのプロパティを確認
      const documentProps = Object.keys(editorAny.document);
      console.log("[FileEditor] Document properties:", documentProps);

      // blocksプロパティがあるか確認
      if (documentProps.includes("blocks")) {
        console.log(
          "[FileEditor] document.blocksを使用してエディタを初期化します"
        );

        // BlockNoteViewをレンダリング
        return (
          <DragDropHandler>
            <div className="editor-container" ref={editorContainerRef}>
              <MantineProvider
                theme={createTheme({})}
                defaultColorScheme="light"
              >
                <ErrorBoundary
                  fallback={
                    <div className="editor-error">
                      エディタのレンダリングに失敗しました
                    </div>
                  }
                >
                  <BlockNoteView editor={editor} ref={editorViewRef} />
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
    }

    // _tiptapEditorを使用する方法も試す
    if (editorAny._tiptapEditor) {
      console.log("[FileEditor] _tiptapEditorを使用します");

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
                <BlockNoteView editor={editor} ref={editorViewRef} />
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

    return (
      <div className="editor-error">エディタの初期化に問題が発生しました</div>
    );
  }

  // BlockNoteViewをエラーハンドリング付きでレンダリング
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
            <BlockNoteView editor={editor} ref={editorViewRef} />
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
