import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@mantine/core/styles.css";
import { Providers } from "./components/Providers";
import { SidebarWrapper } from "./components/SidebarWrapper";
import { FileTreeServer } from "./components/FileTreeServer";
import styles from "./layout.module.css";
import { ContextMenuLayout } from "./components/ContextMenuLayout";
import { ensureDefaultDirectory } from "./lib/fileSystem";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Local Mark Server",
  description: "Markdown editor for local files",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Local Mark Server",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// デフォルトディレクトリの確認と作成
ensureDefaultDirectory().catch((error) => {
  console.error("Failed to ensure default directory:", error);
});

// グローバルエラーハンドラーを追加
if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = function (...args) {
    // 元のエラーログを出力
    originalError.apply(console, args);

    // エラーオブジェクトがある場合はスタックトレースを出力
    if (args[0] instanceof Error) {
      originalError.call(console, "エラーの詳細情報:", args[0].stack);
    }

    // 'call'に関連するエラーの場合は詳細情報を出力
    if (args[0] && typeof args[0] === "string" && args[0].includes("call")) {
      originalError.call(
        console,
        "Function.prototype.call の状態:",
        typeof Function.prototype.call
      );
      originalError.call(
        console,
        "Function.prototype の状態:",
        Function.prototype
      );
    }
  };

  // グローバルエラーハンドラー
  window.addEventListener("error", function (event) {
    console.error("グローバルエラー発生:", event.error);
    console.error("エラーメッセージ:", event.message);
    console.error("エラー発生ファイル:", event.filename);
    console.error("エラー発生行:", event.lineno);
    console.error("エラー発生列:", event.colno);

    // Function.prototype.callの状態を確認
    console.error(
      "Function.prototype.call の状態:",
      typeof Function.prototype.call
    );

    // 特定のJavaScriptファイルを調査
    if (event.filename && event.filename.includes("1517.js")) {
      console.error("問題のファイルが見つかりました:", event.filename);

      // ファイルの内容を取得して調査
      fetch(event.filename)
        .then((response) => response.text())
        .then((content) => {
          console.error("ファイルの内容:", content.substring(0, 500) + "...");

          // Function.prototype.callを使用している箇所を探す
          const callUsageMatch = content.match(/Function\.prototype\.call/g);
          if (callUsageMatch) {
            console.error(
              "Function.prototype.callの使用箇所:",
              callUsageMatch.length
            );
          }
        })
        .catch((err) => {
          console.error("ファイルの取得に失敗しました:", err);
        });
    }
  });

  // Promiseエラーハンドラー
  window.addEventListener("unhandledrejection", function (event) {
    console.error("未処理のPromiseエラー:", event.reason);
  });

  // ページロード完了時に実行
  window.addEventListener("load", function () {
    console.log("ページロード完了");
    console.log(
      "Function.prototype.call の状態:",
      typeof Function.prototype.call
    );

    // すべてのスクリプトを調査
    const scripts = document.querySelectorAll("script");
    scripts.forEach((script) => {
      if (script.src && script.src.includes("1517.js")) {
        console.log("問題のスクリプトが見つかりました:", script.src);
      }
    });
  });
}

interface RootLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export default async function RootLayout({
  children,
  sidebar,
}: RootLayoutProps) {
  const { initialTree, updateTree } = await FileTreeServer();

  return (
    <html lang="ja">
      <head>
        {/* Function.prototype.callのポリフィル - 最優先で実行（インラインスクリプト） */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 即時実行関数でFunction.prototype.callを保護
              (function() {
                try {
                  // 元のcallメソッドを保存
                  var originalCall = Function.prototype.call;
                  
                  // グローバル変数に保存（デバッグ用）
                  window.__originalFunctionCall = originalCall;
                  
                  // Function.prototype.callが変更されたときに検知するためのプロキシ
                  Object.defineProperty(Function.prototype, 'call', {
                    configurable: true,
                    enumerable: false,
                    get: function() {
                      return window.__originalFunctionCall || originalCall;
                    },
                    set: function(newValue) {
                      console.warn('Function.prototype.callが変更されようとしています');
                      // 変更を許可するが、元の値を保持
                      window.__originalFunctionCall = newValue;
                    }
                  });
                  
                  console.log('Function.prototype.callの保護を設定しました');
                } catch (e) {
                  console.error('Function.prototype.callの保護設定中にエラーが発生しました:', e);
                }
              })();
            `,
          }}
        />

        {/* Function.prototype.callのポリフィル - 詳細実装 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  console.log('Function.prototype.callポリフィルの初期化を開始します');
                  
                  // 元のcallメソッドを保存（存在する場合）
                  var originalCall = window.__originalFunctionCall || Function.prototype.call;
                  
                  // Function.prototypeが存在するか確認
                  if (typeof Function.prototype === 'undefined') {
                    console.error('Function.prototypeが存在しません！');
                    return;
                  }
                  
                  console.log('Function.prototype.callの状態:', typeof Function.prototype.call);
                  
                  // Function.prototype.callが存在するか確認
                  if (typeof Function.prototype.call !== 'function') {
                    console.log('Function.prototype.callのポリフィルを適用します');
                    
                    // Function.prototype.callを再定義
                    var newCall = function() {
                      var fn = this;
                      if (typeof fn !== 'function') {
                        console.error('callメソッドが関数以外に対して呼び出されました:', typeof fn);
                        throw new TypeError('Function.prototype.call was called on non-function');
                      }
                      
                      var thisArg = arguments[0];
                      // undefinedやnullの場合はグローバルオブジェクトを使用
                      if (thisArg === undefined || thisArg === null) {
                        thisArg = typeof window !== 'undefined' ? window : global;
                      }
                      
                      var args = [];
                      for (var i = 1; i < arguments.length; i++) {
                        args.push(arguments[i]);
                      }
                      
                      // 直接関数を呼び出す（applyを使わない）
                      var uniqueProp = '_fn_' + Math.random().toString(36).substr(2, 9);
                      thisArg[uniqueProp] = fn;
                      
                      var result;
                      try {
                        switch (args.length) {
                          case 0: result = thisArg[uniqueProp](); break;
                          case 1: result = thisArg[uniqueProp](args[0]); break;
                          case 2: result = thisArg[uniqueProp](args[0], args[1]); break;
                          case 3: result = thisArg[uniqueProp](args[0], args[1], args[2]); break;
                          default:
                            // 直接引数を展開
                            var argStr = '';
                            for (var j = 0; j < args.length; j++) {
                              argStr += (j > 0 ? ',' : '') + 'args[' + j + ']';
                            }
                            result = eval('thisArg[uniqueProp](' + argStr + ')');
                        }
                      } catch (e) {
                        console.error('ポリフィルされたcallの実行中にエラーが発生しました:', e);
                        throw e;
                      } finally {
                        // 一時プロパティを削除
                        delete thisArg[uniqueProp];
                      }
                      
                      return result;
                    };
                    
                    // グローバル変数に保存
                    window.__originalFunctionCall = newCall;
                    
                    // プロパティを直接設定
                    Object.defineProperty(Function.prototype, 'call', {
                      value: newCall,
                      writable: true,
                      configurable: true,
                      enumerable: false
                    });
                    
                    // 適用確認
                    console.log('Function.prototype.callのポリフィルが適用されました:', typeof Function.prototype.call);
                  } else {
                    console.log('Function.prototype.callは既に存在します。ポリフィルは適用しません。');
                  }
                  
                  // テスト関数でポリフィルをテスト
                  function testFunction() {
                    return this.testValue;
                  }
                  
                  var testObject = { testValue: 'ポリフィルテスト成功' };
                  try {
                    var testResult = testFunction.call(testObject);
                    console.log('ポリフィルテスト結果:', testResult);
                  } catch (e) {
                    console.error('ポリフィルテスト失敗:', e);
                  }
                } catch (e) {
                  console.error('ポリフィルの適用に失敗しました:', e);
                  
                  // 元のメソッドを復元（存在した場合）
                  if (originalCall) {
                    console.log('元のFunction.prototype.callを復元します');
                    window.__originalFunctionCall = originalCall;
                    
                    Object.defineProperty(Function.prototype, 'call', {
                      value: originalCall,
                      writable: true,
                      configurable: true,
                      enumerable: false
                    });
                  }
                }
              })();
            `,
          }}
        />

        {/* 問題のスクリプト（1517.js）を監視するスクリプト */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 問題のファイル（1517.js）を特定するためのスクリプト
              window.addEventListener('DOMContentLoaded', function() {
                console.log('DOMContentLoaded - スクリプトの検索を開始します');
                try {
                  monitorScripts();
                } catch (e) {
                  console.error('DOMContentLoadedでのスクリプト監視中にエラーが発生しました:', e);
                }
              });
              
              window.addEventListener('load', function() {
                console.log('ページロード完了 - スクリプトの検索を開始します');
                try {
                  monitorScripts();
                } catch (e) {
                  console.error('ページロード完了時のスクリプト監視中にエラーが発生しました:', e);
                }
              });
              
              function monitorScripts() {
                try {
                  // すべてのスクリプトタグを検索
                  var scripts = document.querySelectorAll('script');
                  scripts.forEach(function(script) {
                    if (script.src && script.src.includes('1517')) {
                      console.log('問題のスクリプトが見つかりました:', script.src);
                      
                      // スクリプトの内容を取得
                      fetch(script.src)
                        .then(function(response) { return response.text(); })
                        .then(function(text) {
                          console.log('スクリプトの内容（先頭500文字）:', text.substring(0, 500));
                          
                          // Function.prototype.callの使用箇所を検索
                          var callUsage = text.match(/Function\\.prototype\\.call/g);
                          if (callUsage) {
                            console.log('Function.prototype.callの使用箇所:', callUsage.length);
                          }
                          
                          // 特定のパターンを検索（正規表現を修正）
                          var fPattern = text.match(/function\\s+f\\s*\\(/g);
                          if (fPattern) {
                            console.log('function f() パターンの出現回数:', fPattern.length);
                            
                            // function f の周辺コードを抽出
                            var fIndex = text.indexOf('function f(');
                            if (fIndex !== -1) {
                              console.log('function f の周辺コード:', text.substring(fIndex, fIndex + 200));
                            }
                          }
                        })
                        .catch(function(error) {
                          console.error('スクリプトの取得に失敗しました:', error);
                        });
                    }
                  });
                  
                  // ネットワークリクエストを監視
                  if (window.performance && window.performance.getEntries) {
                    var entries = window.performance.getEntries();
                    entries.forEach(function(entry) {
                      if (entry.name && entry.name.includes('1517')) {
                        console.log('問題のリソースが見つかりました:', entry.name);
                      }
                    });
                  }
                  
                  // グローバルエラーハンドラーを設定
                  window.addEventListener('error', function(event) {
                    if (event.error && event.error.stack && event.error.stack.includes('1517.js')) {
                      console.log('1517.jsに関連するエラーが検出されました:', event.error);
                    }
                  });
                } catch (e) {
                  console.error('スクリプト監視中にエラーが発生しました:', e);
                }
              }
            `,
          }}
        />

        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0066cc" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link
          rel="icon"
          href="/apple-touch-icon.png"
          type="image/png"
          sizes="512x512"
        />
        <link
          rel="apple-touch-icon"
          href="/apple-touch-icon.png"
          type="image/png"
        />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LocalMark" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${styles.body}`}
      >
        <Providers initialTree={initialTree} updateTree={updateTree}>
          <div className={styles.container}>
            {sidebar}
            <main className={styles.main}>
              <ContextMenuLayout>
                {children}

                {/* エラーが発生した場合のフォールバックUI */}
                <div
                  id="error-fallback"
                  style={{
                    display: "none",
                    padding: "20px",
                    backgroundColor: "#ffeeee",
                    border: "1px solid #ff0000",
                    borderRadius: "5px",
                    margin: "20px",
                    maxWidth: "800px",
                  }}
                >
                  <h2>エラーが発生しました</h2>
                  <p>アプリケーションの実行中にエラーが発生しました。</p>
                  <p id="error-message"></p>
                  <button
                    id="reload-button"
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#0066cc",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    ページを再読み込み
                  </button>
                </div>

                {/* エラーハンドリングスクリプト */}
                <script
                  dangerouslySetInnerHTML={{
                    __html: `
                      window.addEventListener('error', function(event) {
                        if (event.message && event.message.includes('Cannot read properties of undefined (reading \\'call\\')')) {
                          // エラーメッセージを表示
                          document.getElementById('error-message').textContent = event.message;
                          document.getElementById('error-fallback').style.display = 'block';
                          
                          // リロードボタンのイベントリスナーを追加
                          document.getElementById('reload-button').addEventListener('click', function() {
                            window.location.reload();
                          });
                          
                          // コンソールにエラー情報を出力
                          console.error('エラーをキャッチしました:', event.message);
                          console.error('エラー発生ファイル:', event.filename);
                          console.error('エラー発生行:', event.lineno);
                        }
                      });
                    `,
                  }}
                />
              </ContextMenuLayout>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
