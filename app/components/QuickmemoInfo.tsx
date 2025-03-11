"use client";

import { FC } from "react";

export function QuickmemoInfo() {
  return (
    <div className="quickmemo">
      <h2>クイックメモ</h2>
      <p className="description">
        ブラウザ上に一時的にMarkdownメモができます。⌘+Sで保存すると新規ファイルとしてサーバーに保存できます。
      </p>
    </div>
  );
}

/* .quickmemo {
  // スタイルがあれば必要に応じて更新
} */
