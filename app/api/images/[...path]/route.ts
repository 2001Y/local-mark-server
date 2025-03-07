import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, extname } from "path";

// ベースディレクトリのパス（環境変数から取得するか、ハードコードする）
const BASE_DIR = process.env.NEXT_PUBLIC_DEFAULT_MD_PATH || "";

// MIMEタイプのマッピング
const mimeTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export async function GET(request: NextRequest, context: any) {
  try {
    // パスパラメータを取得
    const pathSegments = context.params.path;
    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse("画像パスが指定されていません", { status: 400 });
    }

    // パスを結合
    const imagePath = pathSegments.join("/");
    console.log(`[API] 画像リクエスト: ${imagePath}`);

    // ベースディレクトリと結合して絶対パスを生成
    const fsPath = join(BASE_DIR, imagePath);
    console.log(`[API] 画像ファイルパス: ${fsPath}`);

    try {
      // ファイルを読み込む
      const fileBuffer = await readFile(fsPath);

      // ファイル拡張子からMIMEタイプを決定
      const ext = extname(fsPath).toLowerCase();
      const contentType = mimeTypes[ext] || "application/octet-stream";

      // レスポンスを返す
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch (error) {
      console.error(`[API] 画像ファイル読み込みエラー: ${fsPath}`, error);
      return new NextResponse("画像が見つかりません", { status: 404 });
    }
  } catch (error) {
    console.error("[API] 画像取得エラー:", error);
    return new NextResponse("サーバーエラー", { status: 500 });
  }
}
