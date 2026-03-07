import { readFile } from "node:fs/promises";

import { createEmptyFeedData, createEmptyFeedMeta } from "./core";
import type { FeedData, FeedMeta } from "./types";

async function loadJson<T>(url: URL, fallback: T): Promise<T> {
  try {
    const contents = await readFile(url, "utf8");
    return JSON.parse(contents) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

export async function loadFeedData(): Promise<FeedData> {
  return loadJson(new URL("../../../public/data/feed.json", import.meta.url), createEmptyFeedData());
}

export async function loadFeedMeta(): Promise<FeedMeta> {
  return loadJson(new URL("../../../public/data/meta.json", import.meta.url), createEmptyFeedMeta());
}
