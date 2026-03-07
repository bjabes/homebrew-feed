// @vitest-environment node

import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { runFeedUpdate } from "../src/lib/feed/update";
import { dayOneCasks, dayOneFormulae, dayTwoCasks, dayTwoFormulae } from "./fixtures/feed";

describe("runFeedUpdate", () => {
  it("writes daily snapshots and only changes outputs when the feed changes", async () => {
    const root = await mkdtemp(join(tmpdir(), "homebrew-feed-"));
    const historyDir = join(root, "data", "history");
    const publicDataDir = join(root, "public", "data");

    const firstResult = await runFeedUpdate({
      date: "2026-03-05",
      generatedAt: "2026-03-05T14:00:00.000Z",
      historyDir,
      publicDataDir,
      fetchCollections: async () => ({
        formulae: dayOneFormulae,
        casks: dayOneCasks
      })
    });

    expect(firstResult.changed).toBe(true);

    const secondResult = await runFeedUpdate({
      date: "2026-03-05",
      generatedAt: "2026-03-05T14:00:00.000Z",
      historyDir,
      publicDataDir,
      fetchCollections: async () => ({
        formulae: dayOneFormulae,
        casks: dayOneCasks
      })
    });

    expect(secondResult.changed).toBe(false);

    const thirdResult = await runFeedUpdate({
      date: "2026-03-06",
      generatedAt: "2026-03-06T14:00:00.000Z",
      historyDir,
      publicDataDir,
      fetchCollections: async () => ({
        formulae: dayTwoFormulae,
        casks: dayTwoCasks
      })
    });

    expect(thirdResult.changed).toBe(true);

    const feedJson = JSON.parse(
      await readFile(join(publicDataDir, "feed.json"), "utf8")
    );

    expect(feedJson.latestSnapshotDate).toBe("2026-03-06");
    expect(feedJson.items).toHaveLength(3);
  });
});
