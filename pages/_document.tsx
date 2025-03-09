import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="ja">
      <Head>
        {/* Function.prototype.callのポリフィル - 最優先で実行 */}
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
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
