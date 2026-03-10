import type {
  DailySnapshot,
  FeedBrowserState,
  FeedData,
  FeedFilterKind,
  FeedItem,
  FeedMeta,
  FeedWindow,
  SnapshotEntry
} from "./types";

const RECENT_FEED_DAYS = 45;
const WINDOW_ORDER: FeedWindow[] = ["today", "last7", "previous7", "month"];

export interface FeedItemGroup {
  date: string;
  items: FeedItem[];
}

export interface FeedDerivedMeta {
  browseAnchorDate: string | null;
  itemCount: number;
  trustedSnapshotCount: number | null;
  windowCounts: Record<FeedWindow, number>;
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseIsoDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function normalizeDescription(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeSha(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (value === undefined || value === null) {
    return undefined;
  }

  return JSON.stringify(value);
}

function createSignature(parts: Array<string | number | undefined>): string {
  return parts.map((part) => String(part ?? "")).join("::");
}

function compareEntries(left: SnapshotEntry, right: SnapshotEntry): number {
  return `${left.kind}:${left.token}`.localeCompare(`${right.kind}:${right.token}`);
}

function compareFeedItems(left: FeedItem, right: FeedItem): number {
  const dateComparison = right.date.localeCompare(left.date);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  return `${left.kind}:${left.token}`.localeCompare(`${right.kind}:${right.token}`);
}

export function formatSnapshotVersion(entry: SnapshotEntry): string {
  if (entry.kind === "formula" && entry.revision && entry.revision > 0) {
    return `${entry.version}_${entry.revision}`;
  }

  return entry.version;
}

export function normalizeFormulaEntry(entry: Record<string, unknown>): SnapshotEntry {
  const token = normalizeString(entry.name);
  const stableVersion = normalizeString(
    (entry.versions as Record<string, unknown> | undefined)?.stable,
    "unknown"
  );
  const revisionValue = entry.revision;
  const revision =
    typeof revisionValue === "number"
      ? revisionValue
      : Number.parseInt(normalizeString(revisionValue), 10) || 0;
  const sha256 = normalizeSha(
    (entry.urls as Record<string, unknown> | undefined)?.stable &&
      ((entry.urls as Record<string, unknown>).stable as Record<string, unknown>).checksum
  );

  return {
    kind: "formula",
    token,
    name: normalizeString(entry.full_name, token),
    packageUrl: `https://formulae.brew.sh/formula/${token}`,
    version: stableVersion,
    revision,
    sha256,
    signature: createSignature(["formula", token, stableVersion, revision, sha256])
  };
}

export function normalizeCaskEntry(entry: Record<string, unknown>): SnapshotEntry {
  const token = normalizeString(entry.token);
  const nameValue = entry.name;
  const name =
    Array.isArray(nameValue) && nameValue.length > 0
      ? normalizeString(nameValue[0], token)
      : normalizeString(nameValue, token);
  const version = normalizeString(entry.version, "latest");
  const sha256 = normalizeSha(entry.sha256);

  return {
    kind: "cask",
    token,
    name,
    packageUrl: `https://formulae.brew.sh/cask/${token}`,
    version,
    sha256,
    signature: createSignature(["cask", token, version, sha256])
  };
}

export function buildSnapshot(formulae: unknown[], casks: unknown[]): SnapshotEntry[] {
  return [
    ...formulae.map((entry) => normalizeFormulaEntry(entry as Record<string, unknown>)),
    ...casks.map((entry) => normalizeCaskEntry(entry as Record<string, unknown>))
  ].sort(compareEntries);
}

export function buildDescriptionLookup(formulae: unknown[], casks: unknown[]): Map<string, string> {
  const descriptions = new Map<string, string>();

  for (const entry of formulae) {
    const record = entry as Record<string, unknown>;
    const token = normalizeString(record.name);
    const description = normalizeDescription(record.desc);

    if (token && description) {
      descriptions.set(`formula:${token}`, description);
    }
  }

  for (const entry of casks) {
    const record = entry as Record<string, unknown>;
    const token = normalizeString(record.token);
    const description = normalizeDescription(record.desc);

    if (token && description) {
      descriptions.set(`cask:${token}`, description);
    }
  }

  return descriptions;
}

export function diffSnapshots(
  previous: SnapshotEntry[],
  current: SnapshotEntry[],
  date: string
): FeedItem[] {
  const previousEntries = new Map(previous.map((entry) => [`${entry.kind}:${entry.token}`, entry]));
  const items: FeedItem[] = [];

  for (const entry of current) {
    const key = `${entry.kind}:${entry.token}`;
    const prior = previousEntries.get(key);

    if (!prior) {
      items.push({
        date,
        kind: entry.kind,
        token: entry.token,
        name: entry.name,
        changeType: "new",
        currentVersion: formatSnapshotVersion(entry),
        previousVersion: null,
        packageUrl: entry.packageUrl
      });
      continue;
    }

    if (prior.signature !== entry.signature) {
      items.push({
        date,
        kind: entry.kind,
        token: entry.token,
        name: entry.name,
        changeType: "updated",
        currentVersion: formatSnapshotVersion(entry),
        previousVersion: formatSnapshotVersion(prior),
        packageUrl: entry.packageUrl
      });
    }
  }

  return items.sort((left, right) => `${left.kind}:${left.token}`.localeCompare(`${right.kind}:${right.token}`));
}

export function resolveFeedAnchorDate(
  items: readonly FeedItem[],
  latestSnapshotDate: string | null
): string | null {
  if (latestSnapshotDate) {
    return latestSnapshotDate;
  }

  let newestItemDate: string | null = null;

  for (const item of items) {
    if (!newestItemDate || item.date > newestItemDate) {
      newestItemDate = item.date;
    }
  }

  return newestItemDate;
}

function getWindowBounds(anchorDate: string, window: FeedWindow): { startDate: Date; endDate: Date } {
  const latestDate = parseIsoDate(anchorDate);

  if (window === "today") {
    return {
      startDate: latestDate,
      endDate: latestDate
    };
  }

  if (window === "last7") {
    return {
      startDate: addUtcDays(latestDate, -6),
      endDate: latestDate
    };
  }

  if (window === "previous7") {
    const endDate = addUtcDays(latestDate, -7);

    return {
      startDate: addUtcDays(endDate, -6),
      endDate
    };
  }

  return {
    startDate: startOfMonth(latestDate),
    endDate: latestDate
  };
}

export function filterFeedItems(
  items: readonly FeedItem[],
  state: Pick<FeedBrowserState, "window" | "type" | "q">,
  latestSnapshotDate: string | null
): FeedItem[] {
  const anchorDate = resolveFeedAnchorDate(items, latestSnapshotDate);

  if (!anchorDate) {
    return [];
  }

  const { startDate, endDate } = getWindowBounds(anchorDate, state.window);
  const query = state.q.trim().toLowerCase();

  return items
    .filter((item) => {
      const itemDate = parseIsoDate(item.date);

      return itemDate >= startDate && itemDate <= endDate;
    })
    .filter((item) => state.type === "all" || item.kind === state.type)
    .filter((item) => {
      if (!query) {
        return true;
      }

      const haystack = `${item.name} ${item.token} ${item.description ?? ""}`.toLowerCase();
      return haystack.includes(query);
    })
    .sort(compareFeedItems);
}

export function groupFeedItemsByDate(items: readonly FeedItem[]): FeedItemGroup[] {
  const groups: FeedItemGroup[] = [];

  for (const item of [...items].sort(compareFeedItems)) {
    const currentGroup = groups.at(-1);

    if (currentGroup?.date === item.date) {
      currentGroup.items.push(item);
      continue;
    }

    groups.push({
      date: item.date,
      items: [item]
    });
  }

  return groups;
}

function buildWindowCounts(items: readonly FeedItem[], latestSnapshotDate: string | null): Record<FeedWindow, number> {
  const counts = {
    today: 0,
    last7: 0,
    previous7: 0,
    month: 0
  };

  const anchorDate = resolveFeedAnchorDate(items, latestSnapshotDate);

  if (!anchorDate) {
    return counts;
  }

  for (const window of WINDOW_ORDER) {
    counts[window] = filterFeedItems(items, { window, type: "all", q: "" }, anchorDate).length;
  }

  return counts;
}

export function deriveFeedMeta(feedData: FeedData, metaData?: FeedMeta | null): FeedDerivedMeta {
  const browseAnchorDate = resolveFeedAnchorDate(feedData.items, feedData.latestSnapshotDate);
  const trustedSnapshotCount =
    metaData &&
    metaData.snapshotCount > 0 &&
    metaData.latestSnapshotDate === browseAnchorDate
      ? metaData.snapshotCount
      : null;

  return {
    browseAnchorDate,
    itemCount: feedData.items.length,
    trustedSnapshotCount,
    windowCounts: buildWindowCounts(feedData.items, browseAnchorDate)
  };
}

export function buildFeedData(
  snapshots: DailySnapshot[],
  generatedAt: string
): { feed: FeedData; meta: FeedMeta } {
  const orderedSnapshots = [...snapshots].sort((left, right) => left.date.localeCompare(right.date));
  const latestSnapshotDate = orderedSnapshots.at(-1)?.date ?? null;
  const recentStartDate =
    latestSnapshotDate === null
      ? null
      : toIsoDate(addUtcDays(parseIsoDate(latestSnapshotDate), -(RECENT_FEED_DAYS - 1)));
  const allItems: FeedItem[] = [];

  for (let index = 1; index < orderedSnapshots.length; index += 1) {
    const previous = orderedSnapshots[index - 1];
    const current = orderedSnapshots[index];
    allItems.push(...diffSnapshots(previous.entries, current.entries, current.date));
  }

  const recentItems =
    recentStartDate === null
      ? []
      : allItems.filter((item) => item.date >= recentStartDate).sort(compareFeedItems);

  return {
    feed: {
      generatedAt,
      latestSnapshotDate,
      items: recentItems
    },
    meta: {
      generatedAt,
      latestSnapshotDate,
      snapshotCount: orderedSnapshots.length,
      itemCount: recentItems.length,
      windowCounts: buildWindowCounts(recentItems, latestSnapshotDate)
    }
  };
}

export function createEmptyFeedData(generatedAt = "1970-01-01T00:00:00.000Z"): FeedData {
  return {
    generatedAt,
    latestSnapshotDate: null,
    items: []
  };
}

export function createEmptyFeedMeta(generatedAt = "1970-01-01T00:00:00.000Z"): FeedMeta {
  return {
    generatedAt,
    latestSnapshotDate: null,
    snapshotCount: 0,
    itemCount: 0,
    windowCounts: {
      today: 0,
      last7: 0,
      previous7: 0,
      month: 0
    }
  };
}
