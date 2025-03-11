"use client";

import { useCallback } from "react";
import { FileInfo } from "../types/file";
import { useTree } from "@/app/context/TreeContext";
import {
  normalizePath,
  generateUrl,
  generateTreeState,
} from "../lib/pathUtils";
import { useRouter } from "next/navigation";
import { usePath } from "@/app/hooks/usePath";

interface FileListProps {
  files: FileInfo[];
  onFileSelect?: (file: FileInfo) => void;
  emptyMessage?: string;
}

export function FileList({
  files,
  onFileSelect,
  emptyMessage = "ファイルがありません",
}: FileListProps) {
  const { setCurrentPath } = useTree();
  const router = useRouter();
  const { navigateTo } = usePath();

  const handleFileClick = useCallback(
    (file: FileInfo) => {
      navigateTo(file.path);
      onFileSelect?.(file);
    },
    [navigateTo, onFileSelect]
  );

  return (
    <div className="files-container">
      {files.length > 0 ? (
        <div className="files-scroll">
          {files.map((file) => (
            <div
              key={file.path}
              className="file-card"
              onClick={() => handleFileClick(file)}
            >
              <span className="file-icon">📄</span>
              <span className="file-name">{file.name}</span>
              <span className="file-date">
                {file.mtime
                  ? new Date(file.mtime).toLocaleDateString()
                  : "No date"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-files">{emptyMessage}</p>
      )}

      <style jsx>{`
        .files-scroll {
          display: flex;
          gap: 1rem;
          overflow-x: auto;
          padding: 0.5rem;
          margin: 0 -0.5rem;
          -webkit-overflow-scrolling: touch;
        }

        .file-card {
          flex: 0 0 300px;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
          border: solid 1px var(--bn-colors-hovered-background);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .file-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .file-icon {
          font-size: 1.5rem;
        }

        .file-name {
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-date {
          font-size: 0.9rem;
        }

        .no-files {
          font-style: italic;
          padding: 1rem;
          text-align: center;
          background-color: #f8f9fa;
          border-radius: 8px;
        }

        /* スクロールバーのカスタマイズ */
        .files-scroll::-webkit-scrollbar {
          height: 8px;
        }

        .files-scroll::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }

        .files-scroll::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 4px;
        }

        .files-scroll::-webkit-scrollbar-thumb:hover {
          background: #999;
        }
      `}</style>
    </div>
  );
}
