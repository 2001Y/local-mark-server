"use client";

import { useEffect, useRef } from "react";

/**
 * 開発環境でエラーを検出するためのカスタムフック
 *
 * @param errorMessage エラーメッセージ
 * @param condition エラー条件（trueの場合にエラーを表示）
 * @param data デバッグ用のデータ
 */
export function useDebugError(
  errorMessage: string,
  condition: boolean,
  data?: any
): void {
  const errorShownRef = useRef(false);

  useEffect(() => {
    // 同じエラーを繰り返し表示しないようにする
    if (condition && !errorShownRef.current) {
      errorShownRef.current = true;

      console.error(`[DEBUG ERROR] ${errorMessage}`, data);

      // 開発環境でのみエラーを表示
      if (process.env.NODE_ENV === "development") {
        const error = new Error(`[DEBUG ERROR] ${errorMessage}`);
        error.name = "DebugError";
        console.error(error.stack);

        // エラーをUIに表示（オプション）
        const errorDiv = document.createElement("div");
        errorDiv.style.position = "fixed";
        errorDiv.style.top = "0";
        errorDiv.style.left = "0";
        errorDiv.style.right = "0";
        errorDiv.style.backgroundColor = "red";
        errorDiv.style.color = "white";
        errorDiv.style.padding = "10px";
        errorDiv.style.zIndex = "9999";
        errorDiv.style.fontSize = "14px";
        errorDiv.style.fontFamily = "monospace";
        errorDiv.textContent = `[DEBUG ERROR] ${errorMessage}`;
        document.body.appendChild(errorDiv);

        // 5秒後に削除
        setTimeout(() => {
          try {
            document.body.removeChild(errorDiv);
          } catch (e) {
            // エラーを無視
          }
        }, 5000);
      }
    } else if (!condition) {
      // 条件が解消されたらフラグをリセット
      errorShownRef.current = false;
    }
  }, [errorMessage, condition, data]);
}
