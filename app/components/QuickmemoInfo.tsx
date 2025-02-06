"use client";

import { FC } from "react";

export function QuickmemoInfo() {
  return (
    <div className="quickmemo">
      <h2>クイックメモ</h2>
      <p className="description">
        ブラウザ上に一時的にMarkdownメモができます。⌘+Sで保存すると新規ファイルとしてサーバーに保存できます。
      </p>

      <style jsx>{`
         {
          /* .quickmemo {
          padding: 1.5rem;
          background-color: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #eaeaea;
        }

        h2 {
          margin: 0 0 1rem;
          font-size: 1.5rem;
          color: #333;
        } */
        }

        .description {
          color: #666;
          margin: 0;
        }
      `}</style>
    </div>
  );
}

/* .quickmemo {
  // スタイルがあれば必要に応じて更新
} */
