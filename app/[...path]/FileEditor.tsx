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

import { useCallback, useEffect, useState, useRef } from "react";
import { Block, BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { MantineProvider, createTheme } from "@mantine/core";
import { toast } from "sonner";
import { useEditor } from "@/app/context/EditorContext";
import { debounce } from "lodash";

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
        const blocks = editor.topLevelBlocks;
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
    editor.onEditorContentChange(onChange);

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

  // ブロックからMarkdownへの変換を最適化
  const convertToMarkdown = useCallback(
    async (blocks: Block[]) => {
      if (!editor || !isMounted.current || blocks.length === 0) return;

      try {
        const markdown = await editor.blocksToMarkdownLossy(blocks);
        setEditorState((prev) => ({
          ...prev,
          content: markdown,
        }));
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

  if (!editor) return null;

  return (
    <div className="editor-container">
      <MantineProvider theme={createTheme({})} defaultColorScheme="light">
        <BlockNoteView editor={editor} ref={editorViewRef} />
      </MantineProvider>
      <style jsx>{`
        .editor-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  );
}
