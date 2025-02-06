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

interface EditorContextType {
  editor: BlockNoteEditor | null;
  blockCache: Map<string, Block[]>;
  setBlockCache: (path: string, blocks: Block[]) => void;
  getBlockCache: (path: string) => Block[] | undefined;
  clearBlockCache: (path: string) => void;
  editorViewRef: React.RefObject<HTMLDivElement>;
  setEditorOnChange: (onChange?: () => void) => void;
  isProcessing: boolean;
}

const EditorContext = createContext<EditorContextType | null>(null);

interface EditorProviderProps {
  children: React.ReactNode;
}

export function EditorProvider({ children }: EditorProviderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const editor = useBlockNote({
    initialContent: undefined,
  });
  const blockCacheRef = useRef(new Map<string, Block[]>());
  const editorViewRef = useRef<HTMLDivElement>(null);
  const [onChange, setOnChange] = useState<(() => void) | undefined>();

  // メモ化されたキャッシュ操作
  const memoizedCacheOperations = useMemo(
    () => ({
      setBlockCache: (path: string, blocks: Block[]) => {
        blockCacheRef.current.set(path, blocks);
      },
      getBlockCache: (path: string) => {
        return blockCacheRef.current.get(path);
      },
      clearBlockCache: (path: string) => {
        blockCacheRef.current.delete(path);
      },
    }),
    []
  );

  const setEditorOnChange = useCallback((newOnChange?: () => void) => {
    setOnChange(() => newOnChange);
  }, []);

  // Web Worker用のセットアップ
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Web Workerのセットアップ用のプレースホルダー
      // TODO: 実際のWeb Worker実装
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      editor,
      blockCache: blockCacheRef.current,
      ...memoizedCacheOperations,
      editorViewRef,
      setEditorOnChange,
      isProcessing,
    }),
    [editor, memoizedCacheOperations, setEditorOnChange, isProcessing]
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
          .editor-wrapper .bn-editor {
            flex: 1;
            overflow-y: auto;
          }
          .editor-wrapper .mantine-BlockNoteEditor-root {
            height: 100%;
          }
          .bn-block-group {
            padding: 3em 0;
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
