export type PackageKind = "formula" | "cask";
export type ChangeType = "new" | "updated";
export type FeedWindow = "today" | "week" | "month";
export type FeedFilterKind = "all" | PackageKind;

export interface SnapshotEntry {
  kind: PackageKind;
  token: string;
  name: string;
  packageUrl: string;
  version: string;
  revision?: number;
  sha256?: string;
  signature: string;
}

export interface DailySnapshot {
  date: string;
  generatedAt: string;
  entries: SnapshotEntry[];
}

export interface FeedItem {
  date: string;
  kind: PackageKind;
  token: string;
  name: string;
  changeType: ChangeType;
  currentVersion: string;
  previousVersion: string | null;
  packageUrl: string;
}

export interface FeedData {
  generatedAt: string;
  latestSnapshotDate: string | null;
  items: FeedItem[];
}

export interface FeedMeta {
  generatedAt: string;
  latestSnapshotDate: string | null;
  snapshotCount: number;
  itemCount: number;
  windowCounts: Record<FeedWindow, number>;
}

export interface FeedBrowserState {
  window: FeedWindow;
  type: FeedFilterKind;
  q: string;
}

export interface FeedBrowserModel {
  state: FeedBrowserState;
  visibleItems: FeedItem[];
}
