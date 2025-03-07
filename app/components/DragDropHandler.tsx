"use client";

import { useEffect, useState } from "react";

interface DragDropHandlerProps {
  children: React.ReactNode;
}

export function DragDropHandler({ children }: DragDropHandlerProps) {
  const [isDragging, setIsDragging] = useState(false);

  // ドラッグ&ドロップイベントのハンドリング
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // ドロップ可能な表示にする
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }

      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      // ここでは特別な処理は行わず、単にブラウザのデフォルト動作を防止するだけ
      // 実際の画像処理はBlockNoteエディタが行います
    };

    // ドキュメント全体にイベントリスナーを追加
    document.addEventListener(
      "dragenter",
      handleDragEnter as unknown as EventListener
    );
    document.addEventListener(
      "dragover",
      handleDragOver as unknown as EventListener
    );
    document.addEventListener(
      "dragleave",
      handleDragLeave as unknown as EventListener
    );
    document.addEventListener("drop", handleDrop as unknown as EventListener);

    // クリーンアップ
    return () => {
      document.removeEventListener(
        "dragenter",
        handleDragEnter as unknown as EventListener
      );
      document.removeEventListener(
        "dragover",
        handleDragOver as unknown as EventListener
      );
      document.removeEventListener(
        "dragleave",
        handleDragLeave as unknown as EventListener
      );
      document.removeEventListener(
        "drop",
        handleDrop as unknown as EventListener
      );
    };
  }, []);

  return (
    <div className={`drag-drop-container ${isDragging ? "dragging" : ""}`}>
      {children}
      <style jsx>{`
        .drag-drop-container {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .dragging::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.05);
          border: 2px dashed #ccc;
          pointer-events: none;
          z-index: 1000;
        }
      `}</style>
    </div>
  );
}
