import { Block } from "@blocknote/core";
import { hash } from "./hash";
import { loadFront } from "yaml-front-matter";

// 型定義の追加
declare module "yaml-front-matter" {
  interface YamlFrontMatter {
    __content: string;
    [key: string]: any;
  }
  export function loadFront(content: string): YamlFrontMatter;
}

const CACHE_PREFIX = "block_cache_";
const CACHE_VERSION = "v1";

interface CacheData {
  blocks: Block[];
  hash: string;
  timestamp: number;
}

// キャッシュキーの生成
function getCacheKey(path: string): string {
  return `${CACHE_PREFIX}${CACHE_VERSION}_${path}`;
}

// front-matterからハッシュを取得
function getHashFromContent(content: string): string {
  const { __content, ...frontMatter } = loadFront(content);
  return frontMatter.hash || "";
}

// ブロックの内容を比較
function compareBlocks(blocksA: Block[], blocksB: Block[]): boolean {
  return JSON.stringify(blocksA) === JSON.stringify(blocksB);
}

// キャッシュの保存
export function setBlockCache(
  path: string,
  blocks: Block[],
  contentHash?: string
): void {
  try {
    const cacheData: CacheData = {
      blocks,
      hash: contentHash || hash(JSON.stringify(blocks)),
      timestamp: Date.now(),
    };
    localStorage.setItem(getCacheKey(path), JSON.stringify(cacheData));
    console.log(`[BlockCache] 💾 キャッシュを保存しました: ${path}`);
  } catch (error) {
    console.error("[BlockCache] ❌ キャッシュの保存に失敗:", error);
  }
}

// キャッシュの取得
export function getBlockCache(path: string): Block[] | null {
  try {
    const cacheKey = getCacheKey(path);
    const cacheString = localStorage.getItem(cacheKey);
    if (!cacheString) return null;

    const cacheData = JSON.parse(cacheString) as CacheData;
    return cacheData.blocks;
  } catch (error) {
    console.error("[BlockCache] ❌ キャッシュの取得に失敗:", error);
    return null;
  }
}

// キャッシュのハッシュ取得
export function getCacheHash(path: string): string | null {
  try {
    const cacheKey = getCacheKey(path);
    const cacheString = localStorage.getItem(cacheKey);
    if (!cacheString) return null;

    const cacheData = JSON.parse(cacheString) as CacheData;
    return cacheData.hash;
  } catch (error) {
    console.error("[BlockCache] ❌ キャッシュのハッシュ取得に失敗:", error);
    return null;
  }
}

// コンテンツの更新チェック
export function isContentUpdated(
  currentBlocks: Block[] | null,
  newBlocks: Block[] | null,
  serverContent?: string
): boolean {
  if (!currentBlocks || !newBlocks) return true;

  // サーバーコンテンツがある場合はハッシュを比較
  if (serverContent) {
    const serverHash = getHashFromContent(serverContent);
    const cacheHash = getCacheHash(serverContent);

    if (serverHash && cacheHash && serverHash !== cacheHash) {
      console.log("[BlockCache] 📝 ハッシュが異なります", {
        server: serverHash,
        cache: cacheHash,
      });
      return true;
    }
  }

  // ハッシュがない場合やローカルストレージの比較の場合はブロックを直接比較
  return !compareBlocks(currentBlocks, newBlocks);
}

// キャッシュの削除
export function clearBlockCache(path: string): void {
  try {
    localStorage.removeItem(getCacheKey(path));
    console.log(`[BlockCache] 🗑️ キャッシュを削除しました: ${path}`);
  } catch (error) {
    console.error("[BlockCache] ❌ キャッシュの削除に失敗:", error);
  }
}

// キャッシュの統計情報
export function getCacheStats(): { totalSize: number; count: number } {
  try {
    let totalSize = 0;
    let count = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length;
          count++;
        }
      }
    }

    return { totalSize, count };
  } catch (error) {
    console.error("[BlockCache] ❌ キャッシュ統計の取得に失敗:", error);
    return { totalSize: 0, count: 0 };
  }
}
