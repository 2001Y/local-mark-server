import { Block } from "@blocknote/core";
import { createHash } from "crypto";

const CACHE_PREFIX = "block_cache_";
const CACHE_KEY = "editor_blocks_cache";

export interface CacheEntry {
  blocks: Block[];
  timestamp: number;
  contentHash: string;
}

interface BlockCache {
  [path: string]: {
    blocks: Block[];
    hash: string;
  };
}

// コンテンツのハッシュを計算
const calculateContentHash = (blocks: Block[]): string => {
  try {
    // ブロックの本質的な内容のみを抽出
    const simplifiedBlocks = blocks.map((block) => ({
      type: block.type,
      content: block.content,
      children: block.children,
    }));
    const contentString = JSON.stringify(simplifiedBlocks);
    return createHash("sha256").update(contentString).digest("hex");
  } catch {
    console.warn("ハッシュ計算に失敗しました");
    return Date.now().toString(); // フォールバック
  }
};

// キャッシュの取得
const getCache = (): BlockCache => {
  try {
    const data = localStorage.getItem(CACHE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

// キャッシュの保存
const saveCache = (cache: BlockCache): boolean => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    return true;
  } catch {
    // ストレージ容量超過時は全キャッシュをクリア
    try {
      localStorage.removeItem(CACHE_KEY);
      return false;
    } catch {
      return false;
    }
  }
};

// コンテンツが更新されているかチェック
export const isContentUpdated = (
  oldBlocks: Block[],
  newBlocks: Block[]
): boolean => {
  try {
    // ブロック数が異なる場合は更新あり
    if (oldBlocks.length !== newBlocks.length) {
      console.log("[BlockCache] ブロック数が異なります", {
        old: oldBlocks.length,
        new: newBlocks.length,
      });
      return true;
    }

    const oldHash = calculateContentHash(oldBlocks);
    const newHash = calculateContentHash(newBlocks);
    const hasChanged = oldHash !== newHash;

    if (hasChanged) {
      console.log("[BlockCache] コンテンツハッシュが異なります", {
        old: oldHash.slice(0, 8),
        new: newHash.slice(0, 8),
      });
    }

    return hasChanged;
  } catch (error) {
    console.error("[BlockCache] 比較エラー:", error);
    return true; // エラーの場合は安全のため更新ありとする
  }
};

export const setBlockCache = (path: string, blocks: Block[]) => {
  try {
    const cache = getCache();
    cache[path] = {
      blocks,
      hash: calculateContentHash(blocks),
    };
    return saveCache(cache);
  } catch {
    return false;
  }
};

export const getBlockCache = (path: string): Block[] | null => {
  try {
    const cache = getCache();
    return cache[path]?.blocks || null;
  } catch {
    return null;
  }
};

export const clearBlockCache = (path: string) => {
  try {
    const cache = getCache();
    delete cache[path];
    return saveCache(cache);
  } catch {
    return false;
  }
};

// キャッシュの統計情報を取得
export const getCacheStats = () => {
  try {
    const cache = getCache();
    const data = JSON.stringify(cache);
    return {
      totalSize: Math.round((data.length * 2) / 1024), // KB単位
      count: Object.keys(cache).length,
    };
  } catch {
    return { totalSize: 0, count: 0 };
  }
};

// キャッシュのタイムスタンプを取得
export const getCacheTimestamp = (path: string): number | null => {
  try {
    const key = CACHE_PREFIX + path;
    const data = localStorage.getItem(key);
    if (!data) return null;

    const entry: CacheEntry = JSON.parse(data);
    return entry.timestamp;
  } catch {
    return null;
  }
};
