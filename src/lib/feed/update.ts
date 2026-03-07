import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { buildFeedData, buildSnapshot, createEmptyFeedData, createEmptyFeedMeta } from "./core";
import type { DailySnapshot, FeedData, FeedMeta } from "./types";

const FORMULA_API_URL = "https://formulae.brew.sh/api/formula.json";
const CASK_API_URL = "https://formulae.brew.sh/api/cask.json";

interface FeedUpdateOptions {
  date: string;
  generatedAt: string;
  historyDir: string;
  publicDataDir: string;
  fetchCollections?: () => Promise<{
    formulae: unknown[];
    casks: unknown[];
  }>;
}

function stableStringify(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function ensureDirectory(path: string): Promise<void> {
  await mkdir(path, {
    recursive: true
  });
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const contents = await readFile(filePath, "utf8");
    return JSON.parse(contents) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function writeJsonIfChanged(filePath: string, payload: unknown): Promise<boolean> {
  const next = stableStringify(payload);
  const previous = await readFile(filePath, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return null;
    }

    throw error;
  });

  if (previous === next) {
    return false;
  }

  await ensureDirectory(dirname(filePath));
  await writeFile(filePath, next, "utf8");
  return true;
}

async function loadSnapshots(historyDir: string): Promise<DailySnapshot[]> {
  const files = await readdir(historyDir).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return [] as string[];
    }

    throw error;
  });

  const snapshots = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .sort()
      .map(async (file) => {
        const snapshot = await readJsonFile<DailySnapshot>(join(historyDir, file));
        return snapshot;
      })
  );

  return snapshots.filter((snapshot): snapshot is DailySnapshot => snapshot !== null);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed for ${url} with ${response.status}`);
  }

  return (await response.json()) as T;
}

async function defaultFetchCollections(): Promise<{ formulae: unknown[]; casks: unknown[] }> {
  const [formulae, casks] = await Promise.all([
    fetchJson<unknown[]>(FORMULA_API_URL),
    fetchJson<unknown[]>(CASK_API_URL)
  ]);

  return {
    formulae,
    casks
  };
}

function pickRecentArtifacts(snapshots: DailySnapshot[], generatedAt: string): { feed: FeedData; meta: FeedMeta } {
  if (snapshots.length === 0) {
    return {
      feed: createEmptyFeedData(generatedAt),
      meta: createEmptyFeedMeta(generatedAt)
    };
  }

  return buildFeedData(snapshots, generatedAt);
}

export async function runFeedUpdate(options: FeedUpdateOptions): Promise<{
  changed: boolean;
  snapshotPath: string;
  latestSnapshotDate: string | null;
}> {
  const fetchCollections = options.fetchCollections ?? defaultFetchCollections;
  const { formulae, casks } = await fetchCollections();

  const snapshot: DailySnapshot = {
    date: options.date,
    generatedAt: options.generatedAt,
    entries: buildSnapshot(formulae, casks)
  };
  const snapshotPath = join(options.historyDir, `${options.date}.json`);
  const priorSnapshots = (await loadSnapshots(options.historyDir)).filter(
    (item) => item.date !== options.date
  );
  const snapshots = [...priorSnapshots, snapshot].sort((left, right) => left.date.localeCompare(right.date));
  const artifacts = pickRecentArtifacts(snapshots, options.generatedAt);

  await ensureDirectory(options.publicDataDir);

  const snapshotChanged = await writeJsonIfChanged(snapshotPath, snapshot);
  const feedChanged = await writeJsonIfChanged(join(options.publicDataDir, "feed.json"), artifacts.feed);
  const metaChanged = await writeJsonIfChanged(join(options.publicDataDir, "meta.json"), artifacts.meta);

  return {
    changed: snapshotChanged || feedChanged || metaChanged,
    snapshotPath,
    latestSnapshotDate: artifacts.feed.latestSnapshotDate
  };
}
