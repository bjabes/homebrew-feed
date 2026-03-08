import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createEmptyFeedData, createEmptyFeedMeta } from "./core";
import type { FeedData, FeedMeta } from "./types";

const PUBLIC_DATA_DIR = join(process.cwd(), "public", "data");

async function loadJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const contents = await readFile(filePath, "utf8");
    return JSON.parse(contents) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

export async function loadFeedData(): Promise<FeedData> {
  return loadJson(join(PUBLIC_DATA_DIR, "feed.json"), createEmptyFeedData());
}

export async function loadFeedMeta(): Promise<FeedMeta> {
  return loadJson(join(PUBLIC_DATA_DIR, "meta.json"), createEmptyFeedMeta());
}
