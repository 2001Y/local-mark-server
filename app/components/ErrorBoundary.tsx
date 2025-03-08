"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  errorMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * エラー境界コンポーネント
 * 子コンポーネントでエラーが発生した場合にフォールバックUIを表示します
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // エラーが発生した場合にステートを更新
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("エラー境界でエラーをキャッチしました:", error, errorInfo);
    console.error(
      this.props.errorMessage || "コンポーネントでエラーが発生しました"
    );
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      // フォールバックUIを表示
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // デフォルトのフォールバックUI
      return (
        <div className="error-boundary">
          <h2>エラーが発生しました</h2>
          <p>
            {this.props.errorMessage ||
              "コンポーネントの読み込み中にエラーが発生しました"}
          </p>
          <details>
            <summary>詳細を表示</summary>
            <pre>{this.state.error?.toString()}</pre>
          </details>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            再試行
          </button>

          <style jsx>{`
            .error-boundary {
              padding: 20px;
              border: 1px solid #f56565;
              border-radius: 5px;
              background-color: #fff5f5;
              color: #c53030;
              margin: 10px 0;
            }

            h2 {
              margin-top: 0;
              font-size: 1.2rem;
            }

            details {
              margin: 10px 0;
            }

            pre {
              background-color: #f7fafc;
              padding: 10px;
              border-radius: 5px;
              overflow: auto;
              font-size: 0.9rem;
            }

            button {
              background-color: #4299e1;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 0.9rem;
            }

            button:hover {
              background-color: #3182ce;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}
