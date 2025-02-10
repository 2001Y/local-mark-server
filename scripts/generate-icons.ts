import sharp from "sharp";
import { Resvg } from "@resvg/resvg-js";

const SVG_ICON = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0066CC"/>
  <circle cx="256" cy="256" r="180" fill="white"/>
  <path d="M200 180L312 256L200 332V180Z" fill="#0066CC"/>
</svg>
`;

async function generateIcons() {
  // SVGをPNGに変換
  const resvg = new Resvg(SVG_ICON);
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  // アイコンサイズの配列
  const sizes = [192, 512];

  try {
    // public/iconsディレクトリを作成
    await Bun.write("public/icons/.gitkeep", "");

    // 各サイズのアイコンを生成
    for (const size of sizes) {
      await sharp(pngBuffer)
        .resize(size, size)
        .png()
        .toFile(`public/icons/icon-${size}x${size}.png`);

      console.log(`Generated icon-${size}x${size}.png`);
    }

    // favicon.icoも生成
    await sharp(pngBuffer).resize(32, 32).toFile("public/favicon.ico");

    console.log("Generated favicon.ico");
  } catch (error) {
    console.error("Error generating icons:", error);
  }
}

generateIcons();
