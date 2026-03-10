import { describe, expect, it } from "vitest";

import {
  buildFeedData,
  buildSnapshot,
  diffSnapshots,
  filterFeedItems,
  formatSnapshotVersion,
  normalizeCaskEntry,
  normalizeFormulaEntry
} from "../src/lib/feed/core";
import * as feedCore from "../src/lib/feed/core";
import {
  caskFixture,
  dayOneCasks,
  dayOneFormulae,
  dayTwoCasks,
  dayTwoFormulae,
  formulaFixture,
  latestCaskFixture
} from "./fixtures/feed";

describe("feed core", () => {
  it("normalizes formula entries with revision-aware versions", () => {
    const entry = normalizeFormulaEntry({
      ...formulaFixture,
      revision: 2
    });

    expect(entry).toMatchObject({
      kind: "formula",
      token: "wget",
      name: "wget",
      packageUrl: "https://formulae.brew.sh/formula/wget",
      version: "1.25.0",
      revision: 2,
      sha256: "formula-checksum-1"
    });
    expect(formatSnapshotVersion(entry)).toBe("1.25.0_2");
    expect(entry.signature).toContain("1.25.0");
  });

  it("normalizes casks including latest releases", () => {
    const standard = normalizeCaskEntry(caskFixture);
    const latest = normalizeCaskEntry(latestCaskFixture);

    expect(standard).toMatchObject({
      kind: "cask",
      token: "visual-studio-code",
      name: "Visual Studio Code",
      packageUrl: "https://formulae.brew.sh/cask/visual-studio-code",
      version: "1.98.0",
      sha256: "cask-checksum-1"
    });
    expect(latest.version).toBe("latest");
    expect(latest.sha256).toBe("no_check");
  });

  it("builds sorted mixed snapshots and diffs new and updated packages", () => {
    const previous = buildSnapshot(dayOneFormulae, dayOneCasks);
    const current = buildSnapshot(dayTwoFormulae, dayTwoCasks);

    expect(current.map((entry) => `${entry.kind}:${entry.token}`)).toEqual([
      "cask:visual-studio-code",
      "formula:ripgrep",
      "formula:wget"
    ]);

    expect(diffSnapshots(previous, current, "2026-03-06")).toEqual([
      {
        date: "2026-03-06",
        kind: "cask",
        token: "visual-studio-code",
        name: "Visual Studio Code",
        changeType: "updated",
        currentVersion: "1.99.0",
        previousVersion: "1.98.0",
        packageUrl: "https://formulae.brew.sh/cask/visual-studio-code"
      },
      {
        date: "2026-03-06",
        kind: "formula",
        token: "ripgrep",
        name: "ripgrep",
        changeType: "new",
        currentVersion: "14.1.1",
        previousVersion: null,
        packageUrl: "https://formulae.brew.sh/formula/ripgrep"
      },
      {
        date: "2026-03-06",
        kind: "formula",
        token: "wget",
        name: "wget",
        changeType: "updated",
        currentVersion: "1.25.0_1",
        previousVersion: "1.25.0",
        packageUrl: "https://formulae.brew.sh/formula/wget"
      }
    ]);
  });

  it("ignores unchanged metadata churn and removed packages", () => {
    const previous = buildSnapshot(dayOneFormulae, dayOneCasks);
    const current = buildSnapshot(
      [
        {
          ...formulaFixture,
          full_name: "gnu-wget"
        }
      ],
      []
    );

    expect(diffSnapshots(previous, current, "2026-03-06")).toEqual([]);
  });

  it("builds recent feed artifacts with window counts from history", () => {
    const artifacts = buildFeedData(
      [
        {
          date: "2026-02-12",
          generatedAt: "2026-02-12T14:00:00.000Z",
          entries: [normalizeCaskEntry(latestCaskFixture)]
        },
        {
          date: "2026-03-04",
          generatedAt: "2026-03-04T14:00:00.000Z",
          entries: buildSnapshot(dayOneFormulae, dayOneCasks)
        },
        {
          date: "2026-03-06",
          generatedAt: "2026-03-06T14:00:00.000Z",
          entries: buildSnapshot(dayTwoFormulae, dayTwoCasks)
        }
      ],
      "2026-03-06T14:00:00.000Z"
    );

    expect(artifacts.feed.latestSnapshotDate).toBe("2026-03-06");
    expect(artifacts.feed.items).toHaveLength(5);
    expect(artifacts.meta.windowCounts).toEqual({
      today: 3,
      last7: 5,
      previous7: 0,
      month: 5
    });
  });

  it("filters rolling windows without overlapping previous 7 days", () => {
    const items = [
      {
        date: "2026-03-06",
        kind: "formula",
        token: "today-package",
        name: "today-package",
        changeType: "new",
        currentVersion: "1.0.0",
        previousVersion: null,
        packageUrl: "https://formulae.brew.sh/formula/today-package"
      },
      {
        date: "2026-03-01",
        kind: "formula",
        token: "last-seven-package",
        name: "last-seven-package",
        changeType: "new",
        currentVersion: "1.0.0",
        previousVersion: null,
        packageUrl: "https://formulae.brew.sh/formula/last-seven-package"
      },
      {
        date: "2026-02-28",
        kind: "formula",
        token: "last-seven-edge",
        name: "last-seven-edge",
        changeType: "new",
        currentVersion: "1.0.0",
        previousVersion: null,
        packageUrl: "https://formulae.brew.sh/formula/last-seven-edge"
      },
      {
        date: "2026-02-27",
        kind: "cask",
        token: "previous-seven-edge",
        name: "previous-seven-edge",
        changeType: "updated",
        currentVersion: "2.0.0",
        previousVersion: "1.0.0",
        packageUrl: "https://formulae.brew.sh/cask/previous-seven-edge"
      },
      {
        date: "2026-02-22",
        kind: "cask",
        token: "previous-seven-middle",
        name: "previous-seven-middle",
        changeType: "updated",
        currentVersion: "2.0.0",
        previousVersion: "1.0.0",
        packageUrl: "https://formulae.brew.sh/cask/previous-seven-middle"
      },
      {
        date: "2026-02-21",
        kind: "cask",
        token: "previous-seven-start",
        name: "previous-seven-start",
        changeType: "updated",
        currentVersion: "2.0.0",
        previousVersion: "1.0.0",
        packageUrl: "https://formulae.brew.sh/cask/previous-seven-start"
      }
    ] as const;

    expect(
      filterFeedItems(items, { window: "last7", type: "all", q: "" }, "2026-03-06").map(
        (item) => item.token
      )
    ).toEqual(["today-package", "last-seven-package", "last-seven-edge"]);

    expect(
      filterFeedItems(items, { window: "previous7", type: "all", q: "" }, "2026-03-06").map(
        (item) => item.token
      )
    ).toEqual(["previous-seven-edge", "previous-seven-middle", "previous-seven-start"]);
  });

  it("falls back to the newest item date when feed metadata is missing", () => {
    const items = [
      {
        date: "2026-03-06",
        kind: "formula",
        token: "ripgrep",
        name: "ripgrep",
        changeType: "new",
        currentVersion: "14.1.1",
        previousVersion: null,
        packageUrl: "https://formulae.brew.sh/formula/ripgrep"
      },
      {
        date: "2026-03-04",
        kind: "cask",
        token: "visual-studio-code",
        name: "Visual Studio Code",
        changeType: "updated",
        currentVersion: "1.99.0",
        previousVersion: "1.98.0",
        packageUrl: "https://formulae.brew.sh/cask/visual-studio-code"
      }
    ] as const;

    expect(
      filterFeedItems(items, { window: "today", type: "all", q: "" }, null).map((item) => item.token)
    ).toEqual(["ripgrep"]);
    expect(
      filterFeedItems(items, { window: "month", type: "all", q: "" }, null).map((item) => item.token)
    ).toEqual(["ripgrep", "visual-studio-code"]);
  });

  it("builds a latest-description lookup from formula and cask collections", () => {
    const buildDescriptionLookup = (feedCore as Record<string, unknown>).buildDescriptionLookup;

    expect(typeof buildDescriptionLookup).toBe("function");

    const lookup = (
      buildDescriptionLookup as (
        formulae: unknown[],
        casks: unknown[]
      ) => Map<string, string | undefined>
    )(
      [
        formulaFixture,
        {
          name: "htop",
          full_name: "htop",
          desc: "",
          versions: {
            stable: "3.4.1"
          },
          revision: 0,
          urls: {
            stable: {
              checksum: "formula-checksum-3"
            }
          }
        }
      ],
      [
        caskFixture,
        {
          token: "missing-desc",
          name: ["Missing Desc"],
          desc: null,
          version: "1.0.0",
          sha256: "cask-checksum-2"
        }
      ]
    );

    expect(lookup.get("formula:wget")).toBe("Internet file retriever");
    expect(lookup.get("cask:visual-studio-code")).toBe("Open-source code editor");
    expect(lookup.has("formula:htop")).toBe(false);
    expect(lookup.has("cask:missing-desc")).toBe(false);
  });

  it("matches search queries against package descriptions", () => {
    expect(
      filterFeedItems(
        [
          {
            date: "2026-03-06",
            kind: "formula",
            token: "ripgrep",
            name: "ripgrep",
            description: "Line-oriented search tool that recursively searches directories",
            changeType: "new",
            currentVersion: "14.1.1",
            previousVersion: null,
            packageUrl: "https://formulae.brew.sh/formula/ripgrep"
          },
          {
            date: "2026-03-06",
            kind: "formula",
            token: "wget",
            name: "wget",
            description: "Internet file retriever",
            changeType: "updated",
            currentVersion: "1.25.0_1",
            previousVersion: "1.25.0",
            packageUrl: "https://formulae.brew.sh/formula/wget"
          }
        ],
        { window: "today", type: "all", q: "searches directories" },
        "2026-03-06"
      ).map((item) => item.token)
    ).toEqual(["ripgrep"]);
  });
});
