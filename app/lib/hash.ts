import { createHash } from "crypto";
import { loadFront } from "yaml-front-matter";

export function hash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 8);
}

export function updateContentHash(content: string, newHash?: string): string {
  const { __content, ...frontMatter } = loadFront(content);

  // 新しいハッシュが指定されていない場合は生成
  const contentHash = newHash || hash(__content);

  // front-matterを更新
  const updatedFrontMatter = {
    ...frontMatter,
    hash: contentHash,
  };

  // front-matterと本文を結合
  return `---\n${Object.entries(updatedFrontMatter)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")}\n---\n${__content}`;
}

export function extractContentHash(content: string): string | null {
  try {
    const { __content, ...frontMatter } = loadFront(content);
    return frontMatter.hash || null;
  } catch (error) {
    console.error("[Hash] ❌ ハッシュの抽出に失敗:", error);
    return null;
  }
}
