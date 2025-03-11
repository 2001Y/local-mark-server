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
import { MantineProvider } from "@mantine/core";
import { toast } from "sonner";
import { useEditor } from "@/app/context/EditorContext";
import { debounce } from "lodash";

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
  const { loadContent, editor, setCachedBlocks, convertToMarkdown } =
    useEditor();
  const isMounted = useRef(true);
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

  // エディタオブジェクトの基本情報のみログに出力
  useEffect(() => {
    console.log("[FileEditor] Editor object initialized:", !!editor);
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
        // EditorContextのsetCachedBlocks関数を使用してブロックを保存
        // 空の配列を渡すと、EditorContextがエディタから現在のブロックを取得する
        const saveResult = await setCachedBlocks(filePath, []);

        if (saveResult) {
          console.log(`[FileEditor] ✅ 保存成功: ${filePath}`);
          setEditorState((prev) => ({
            ...prev,
            isSaving: false,
          }));
        } else {
          console.error(`[FileEditor] ❌ 保存失敗: ${filePath}`);
          setEditorState((prev) => ({
            ...prev,
            isSaving: false,
          }));
          toast.error("保存に失敗しました");
        }
      } catch (error) {
        console.error("[FileEditor] Error saving content:", error);
        setEditorState((prev) => ({
          ...prev,
          isSaving: false,
        }));
        toast.error("保存に失敗しました");
      }
    },
    [filePath, editorState.isSaving, setCachedBlocks]
  );

  // エディタの変更を検知して保存をトリガー
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

  // ブロックの変更を監視
  useEffect(() => {
    if (convertToMarkdown && editorState.blocks.length > 0) {
      // EditorContextのconvertToMarkdown関数を使用
      convertToMarkdown(editorState.blocks)
        .then((markdown: string | null) => {
          if (markdown) {
            setEditorState((prev) => ({
              ...prev,
              content: markdown,
            }));
          }
        })
        .catch((error: any) => {
          console.error(
            "[FileEditor] Error converting blocks to markdown:",
            error
          );
        });
    }
  }, [editorState.blocks, convertToMarkdown]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">エディタを初期化中...</p>
        </div>
      </div>
    );
  }

  // エディタが初期化されたが、ブロックが空の場合も表示する
  return (
    <div className="h-full flex flex-col">
      <ErrorBoundary
        fallback={
          <div className="p-4 bg-red-50 text-red-800 rounded-md">
            <h3 className="font-bold">エディタでエラーが発生しました</h3>
            <p>ページを再読み込みするか、別のファイルを開いてみてください。</p>
          </div>
        }
      >
        <div
          ref={editorContainerRef}
          className="flex-grow overflow-auto relative"
        >
          {/* <DragDropHandler> */}
          <MantineProvider>
            <BlockNoteView editor={editor} />
          </MantineProvider>
          {/* </DragDropHandler> */}
        </div>
      </ErrorBoundary>
    </div>
  );
}
