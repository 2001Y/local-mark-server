#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ログ出力用の関数
function log(message) {
  console.log(`\x1b[36m[DEPLOY]\x1b[0m ${message}`);
}

// エラーログ出力用の関数
function errorLog(message) {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`);
}

// コマンド実行用の関数
function runCommand(command) {
  log(`実行: ${command}`);
  try {
    const output = execSync(command, { stdio: "inherit" });
    return { success: true, output };
  } catch (error) {
    errorLog(`コマンド実行エラー: ${command}`);
    errorLog(error.message);
    return { success: false, error };
  }
}

// メイン処理
async function main() {
  try {
    log("デプロイを開始します...");

    // 依存関係のインストール
    log("依存関係をインストールしています...");
    runCommand("bun install");

    // アプリケーションのビルド
    log("アプリケーションをビルドしています...");
    runCommand("bun run build");

    // PM2の状態を確認
    log("PM2の状態を確認しています...");
    const isPM2Running = runCommand(
      "pm2 list | grep local-mark-server"
    ).success;

    if (isPM2Running) {
      // PM2プロセスが実行中の場合は再起動
      log("PM2プロセスを再起動しています...");
      runCommand("pm2 reload local-mark-server");
    } else {
      // PM2プロセスが実行されていない場合は起動
      log("PM2プロセスを起動しています...");
      runCommand("pm2 start pm2.config.js");
    }

    // PM2のステータスを表示
    log("PM2のステータスを表示します:");
    runCommand("pm2 status");

    log("デプロイが完了しました！");
    log(`サーバーは http://localhost:3050 で実行されています`);
  } catch (error) {
    errorLog("デプロイ中にエラーが発生しました:");
    errorLog(error.message);
    process.exit(1);
  }
}

// スクリプトの実行
main();
