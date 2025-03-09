#!/usr/bin/env bun

import { spawn } from "child_process";
import { resolve } from "path";

// 現在の日時を取得する関数
function getCurrentDateTime(): string {
  const now = new Date();
  return now
    .toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    .replace(/[\/\s:]/g, "-");
}

// ログ出力用の関数
function log(message: string): void {
  console.log(`\x1b[36m[DEPLOY]\x1b[0m ${message}`);
}

// エラーログ出力用の関数
function errorLog(message: string): void {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`);
}

// コマンド実行用の関数
async function runCommand(
  command: string
): Promise<{ success: boolean; output?: string; error?: Error }> {
  return new Promise((resolve) => {
    log(`実行: ${command}`);

    const [cmd, ...args] = command.split(" ");
    const process = spawn(cmd, args, { shell: true });

    let output = "";
    let errorOutput = "";

    // 標準出力を収集
    if (process.stdout) {
      process.stdout.on("data", (data) => {
        const chunk = data.toString();
        output += chunk;
        // 通常のコマンドは出力を表示
        if (
          !command.includes("git status --porcelain") &&
          !command.includes("git branch --show-current")
        ) {
          console.log(chunk);
        }
      });
    }

    // 標準エラー出力を収集
    if (process.stderr) {
      process.stderr.on("data", (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        // エラー出力を表示
        console.error(chunk);
      });
    }

    process.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true, output });
      } else {
        const error = new Error(
          `コマンドが終了コード ${code} で失敗しました: ${errorOutput}`
        );
        errorLog(`コマンド実行エラー: ${command}`);
        resolve({ success: false, error, output: errorOutput });
      }
    });

    process.on("error", (error) => {
      errorLog(`コマンド実行エラー: ${command}`);
      errorLog(error.message);
      resolve({ success: false, error, output: errorOutput });
    });
  });
}

// PM2が実行中かどうかを確認する関数
async function isPM2Running(): Promise<boolean> {
  const result = await runCommand("pm2 list");

  // デバッグ用のログを追加
  log("PM2の状態詳細:");
  if (result.output) {
    log(`PM2出力: ${result.output}`);
    log(
      `local-mark-serverが含まれているか: ${result.output.includes(
        "local-mark-server"
      )}`
    );
  } else {
    log("PM2出力がありません");
  }

  return result.success && result.output
    ? result.output.includes("local-mark-server")
    : false;
}

// メイン処理
async function main(): Promise<void> {
  try {
    log("デプロイを開始します...");

    // 依存関係のインストール
    log("依存関係をインストールしています...");
    const installResult = await runCommand("bun install");
    if (!installResult.success) {
      errorLog("依存関係のインストールに失敗しました。デプロイを中止します。");
      process.exit(1);
    }

    // アプリケーションのビルド
    log("アプリケーションをビルドしています...");
    const buildResult = await runCommand("bun run build");

    // ビルドが失敗した場合はPM2の更新をスキップ
    if (!buildResult.success) {
      errorLog("ビルドに失敗しました。PM2の更新をスキップします。");
      log("現在のPM2プロセスはそのまま維持されます。");
      process.exit(1);
    }

    // ビルドが成功した場合のみPM2を更新
    log("ビルドが成功しました。PM2を更新します。");

    // Gitの状態を確認
    log("Gitの状態を確認しています...");
    const gitStatusResult = await runCommand("git status --porcelain");

    // Gitの変更がある場合のみコミットとプッシュを実行
    if (gitStatusResult.output && gitStatusResult.output.trim() !== "") {
      log("変更されたファイルがあります。Gitコミットを実行します...");

      // コミットメッセージを生成
      const dateTime = getCurrentDateTime();
      const commitMessage = `Deploy: ${dateTime}`;

      // 変更をステージングしてコミット
      const gitAddResult = await runCommand("git add .");
      if (!gitAddResult.success) {
        errorLog("Gitのステージングに失敗しました。");
      } else {
        const gitCommitResult = await runCommand(
          `git commit -m "${commitMessage}"`
        );
        if (!gitCommitResult.success) {
          errorLog("Gitのコミットに失敗しました。");
        } else {
          log("Gitコミットが成功しました。プッシュを実行します...");

          // 現在のブランチを取得
          const gitBranchResult = await runCommand("git branch --show-current");
          const currentBranch = gitBranchResult.output
            ? gitBranchResult.output.trim()
            : "main";

          // プッシュを実行
          const gitPushResult = await runCommand(
            `git push origin ${currentBranch}`
          );
          if (!gitPushResult.success) {
            errorLog("Gitのプッシュに失敗しました。");
          } else {
            log("Gitプッシュが成功しました。");
          }
        }
      }
    } else {
      log(
        "変更されたファイルがありません。Gitコミットとプッシュをスキップします。"
      );
    }

    // PM2の状態を確認
    log("PM2の状態を確認しています...");
    const pm2Running = await isPM2Running();

    // PM2プロセスの状態を修正
    if (!pm2Running) {
      log("local-mark-serverプロセスが見つかりません。新規に起動します...");
      const startResult = await runCommand("pm2 start pm2.config.js");
      log(`PM2起動結果: ${startResult.success ? "成功" : "失敗"}`);

      if (startResult.success) {
        log("PM2プロセスリストを保存しています...");
        await runCommand("pm2 save");
      } else if (startResult.output) {
        log(`PM2起動エラー詳細: ${startResult.output}`);

        // 起動に失敗した場合、既存のプロセスを削除して再試行
        log("既存のプロセスを削除して再試行します...");
        await runCommand("pm2 delete local-mark-server");
        const retryResult = await runCommand("pm2 start pm2.config.js");
        log(`PM2再試行結果: ${retryResult.success ? "成功" : "失敗"}`);

        if (retryResult.success) {
          log("PM2プロセスリストを保存しています...");
          await runCommand("pm2 save");
        }
      }
    } else {
      // PM2プロセスが実行中の場合は再起動
      log("PM2プロセスを再起動しています...");
      const reloadResult = await runCommand("pm2 reload local-mark-server");
      log(`PM2再起動結果: ${reloadResult.success ? "成功" : "失敗"}`);

      if (!reloadResult.success) {
        if (reloadResult.output) {
          log(`PM2再起動エラー詳細: ${reloadResult.output}`);
        }

        // 再起動に失敗した場合、停止してから起動
        log("再起動に失敗しました。停止してから起動します...");
        await runCommand("pm2 stop local-mark-server");
        const startAfterStopResult = await runCommand(
          "pm2 start pm2.config.js"
        );
        log(
          `PM2再起動（停止後）結果: ${
            startAfterStopResult.success ? "成功" : "失敗"
          }`
        );
      }
    }

    // PM2のステータスを表示
    log("PM2のステータスを表示します:");
    await runCommand("pm2 status");

    log("デプロイが完了しました！");
    log(`サーバーは http://localhost:3050 で実行されています`);

    // Gitの操作結果を表示
    if (gitStatusResult.output && gitStatusResult.output.trim() !== "") {
      log("Gitの操作結果:");
      log(`- コミット: Deploy: ${getCurrentDateTime()}`);
      const gitBranchResult = await runCommand("git branch --show-current");
      const currentBranch = gitBranchResult.output
        ? gitBranchResult.output.trim()
        : "main";
      log(`- プッシュ先: origin/${currentBranch}`);
    } else {
      log(
        "Gitの操作: 変更がなかったため、コミットとプッシュは実行されませんでした。"
      );
    }
  } catch (error) {
    errorLog("デプロイ中にエラーが発生しました:");
    if (error instanceof Error) {
      errorLog(error.message);
    }
    process.exit(1);
  }
}

// スクリプトの実行
main();
