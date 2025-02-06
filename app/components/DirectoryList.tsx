import React from "react";
import Link from "next/link";
import { FileInfo, FileNode } from "../types/file";
import path from "path";
import { generateUrl } from "../lib/pathUtils";

// 日付フォーマット用のヘルパー関数
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

interface DirectoryListProps {
  title: string;
  files: FileInfo[];
  folders?: FileNode[];
  emptyMessage?: string;
  layout?: "scroll" | "grid";
}

export function DirectoryList({
  title,
  files,
  folders = [],
  emptyMessage = "ファイルがありません",
  layout = "scroll",
}: DirectoryListProps) {
  const hasContent = files.length > 0 || folders.length > 0;

  return (
    <div className="directory-section">
      <h2>{title}</h2>
      {folders.length > 0 && (
        <div className="folders-list">
          {folders.map((folder) => (
            <Link
              key={folder.path}
              href={generateUrl(folder.path!)}
              className="folder-item"
            >
              <span className="folder-icon">📁</span>
              <span className="folder-name">{path.basename(folder.path!)}</span>
            </Link>
          ))}
        </div>
      )}
      {files.length > 0 ? (
        <div className={`files-list ${layout}`}>
          {files.map((file) => (
            <Link
              key={file.path}
              href={generateUrl(file.path)}
              className="file-item"
            >
              <div className="file-content">
                <span className="file-icon">📄</span>
                <span className="file-name">{path.basename(file.path)}</span>
                <span className="file-date">
                  {file.lastModified ? formatDate(file.lastModified) : ""}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        !folders.length && <div className="empty-message">{emptyMessage}</div>
      )}
      <style jsx>{`
        .directory-section {
          margin-bottom: 2rem;
        }

        h2 {
          font-size: 1.2rem;
          color: #333;
          margin-bottom: 1rem;
        }

        .folders-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        :global(.folder-item) {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border-radius: 4px;
          border: 1px solid #eaeaea;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s;
        }

        :global(.folder-item:hover) {
          background-color: #f5f5f5;
          border-color: #ddd;
          transform: translateY(-1px);
        }

        .folder-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 0.95rem;
        }

        .folder-icon {
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .files-list {
          display: flex;
          gap: 0.75rem;
        }

        .files-list.scroll {
          overflow-x: auto;
          padding-bottom: 0.5rem;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: #ddd transparent;
        }

        .files-list.grid {
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        :global(.file-item) {
          flex: 0 0 auto;
          width: 200px;
          text-decoration: none;
          color: inherit;
        }

        .files-list.grid :global(.file-item) {
          width: calc(50% - 0.375rem);
        }

        .file-content {
          padding: 0.75rem;
          border: 1px solid #eaeaea;
          border-radius: 4px;
          transition: all 0.2s;
        }

        :global(.file-item:hover) .file-content {
          background-color: #f5f5f5;
          border-color: #ddd;
          transform: translateY(-1px);
        }

        .file-name {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin: 0.25rem 0;
        }

        .file-date {
          display: block;
          font-size: 0.8rem;
          color: #666;
        }

        .empty-message {
          text-align: center;
          color: #666;
          padding: 1rem;
          background: #f5f5f5;
          border-radius: 4px;
        }

        @media (max-width: 768px) {
          .folders-list {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          }

          .files-list.grid :global(.file-item) {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
