import { NextRequest, NextResponse } from "next/server";
import { writeFile, access } from "fs/promises";
import { mkdir } from "fs/promises";
import { join, dirname, extname, basename, relative } from "path";
import { ensureDirectoryExists } from "@/app/lib/fileSystem";
import { normalizePath } from "@/app/lib/pathUtils";
import { constants } from "fs";

// ベースディレクトリのパス（環境変数から取得するか、ハードコードする）
const BASE_DIR = process.env.NEXT_PUBLIC_DEFAULT_MD_PATH || "";

// ファイルが存在するかチェックする関数
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[API] 画像アップロードリクエスト受信");

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const currentPath = formData.get("currentPath") as string;
    const overwrite = formData.get("overwrite") === "true";

    if (!file) {
      console.error("[API] ファイルが見つかりません");
      return NextResponse.json(
        { error: "ファイルが見つかりません" },
        { status: 400 }
      );
    }

    if (!currentPath) {
      console.error("[API] 現在のファイルパスが指定されていません");
      return NextResponse.json(
        { error: "現在のファイルパスが指定されていません" },
        { status: 400 }
      );
    }

    // ファイルタイプの検証
    if (!file.type.startsWith("image/")) {
      console.error("[API] 画像ファイルではありません:", file.type);
      return NextResponse.json(
        { error: "画像ファイルのみアップロード可能です" },
        { status: 400 }
      );
    }

    // ファイルサイズの検証（例: 5MB以下）
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.error("[API] ファイルサイズが大きすぎます:", file.size);
      return NextResponse.json(
        { error: "ファイルサイズは5MB以下にしてください" },
        { status: 400 }
      );
    }

    try {
      // 親ディレクトリのパスを取得
      const parentDir = dirname(currentPath);
      console.log(`[API] 親ディレクトリ: ${parentDir}`);

      // _mediaディレクトリのパスを生成
      const mediaDir = join(parentDir, "_media");
      console.log(`[API] メディアディレクトリ: ${mediaDir}`);

      // _mediaディレクトリが存在することを確認
      const dirExists = await ensureDirectoryExists(mediaDir);
      if (!dirExists) {
        console.error("[API] メディアディレクトリの作成に失敗しました");
        return NextResponse.json(
          { error: "メディアディレクトリの作成に失敗しました" },
          { status: 500 }
        );
      }

      // オリジナルのファイル名を使用（安全な文字のみに変換）
      const fileExt = extname(file.name);
      const baseName = basename(file.name, fileExt);
      const safeBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `${safeBaseName}${fileExt}`;

      const filePath = join(mediaDir, fileName);
      console.log("[API] 保存先ファイルパス:", filePath);

      // ファイルが既に存在するかチェック
      const exists = await fileExists(filePath);
      if (exists && !overwrite) {
        console.log("[API] ファイルが既に存在します:", filePath);

        // ベースディレクトリからの相対パスを計算
        let relativePath;
        if (BASE_DIR && mediaDir.startsWith(BASE_DIR)) {
          relativePath = mediaDir.substring(BASE_DIR.length);
          if (relativePath.startsWith("/")) {
            relativePath = relativePath.substring(1);
          }
          relativePath = join(relativePath, fileName);
        } else {
          relativePath = join("_media", fileName);
        }

        // URLで使用するためにパスの区切り文字を/に統一
        const urlPath = relativePath.replace(/\\/g, "/");

        // 画像へのアクセスパスを生成
        const apiPath = `/api/images/${urlPath}`;

        // 重複を通知
        return NextResponse.json({
          duplicate: true,
          fileName: fileName,
          url: apiPath,
          message: "ファイルが既に存在します。上書きしますか？",
        });
      }

      // ファイルの保存
      const arrayBuffer = await file.arrayBuffer();
      await writeFile(filePath, Buffer.from(arrayBuffer));

      // ベースディレクトリからの相対パスを計算
      let relativePath;
      if (BASE_DIR && mediaDir.startsWith(BASE_DIR)) {
        relativePath = mediaDir.substring(BASE_DIR.length);
        if (relativePath.startsWith("/")) {
          relativePath = relativePath.substring(1);
        }
        relativePath = join(relativePath, fileName);
      } else {
        relativePath = join("_media", fileName);
      }

      // URLで使用するためにパスの区切り文字を/に統一
      const urlPath = relativePath.replace(/\\/g, "/");

      // 画像へのアクセスパスを生成（APIルートを通じてアクセス）
      const apiPath = `/api/images/${urlPath}`;
      console.log("[API] 生成されたAPI画像パス:", apiPath);

      return NextResponse.json({
        url: apiPath,
        success: true,
        duplicate: false,
      });
    } catch (error) {
      console.error("[API] ファイル操作エラー:", error);
      return NextResponse.json(
        { error: "ファイル操作に失敗しました" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[API] 画像アップロードエラー:", error);
    return NextResponse.json(
      { error: "画像のアップロードに失敗しました" },
      { status: 500 }
    );
  }
}
