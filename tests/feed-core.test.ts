import { describe, expect, it } from "vitest";

import {
  buildFeedData,
  buildSnapshot,
  diffSnapshots,
  formatSnapshotVersion,
  normalizeCaskEntry,
  normalizeFormulaEntry
} from "../src/lib/feed/core";
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
      week: 5,
      month: 5
    });
  });
});
