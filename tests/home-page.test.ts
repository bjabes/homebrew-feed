// @vitest-environment node

import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import HomeFeedPage from "../src/components/HomeFeedPage.astro";
import { sampleFeedData, sampleMetaData } from "./fixtures/feed";

describe("HomeFeedPage", () => {
  it("renders grouped browse sections from feed data even when meta is stale", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HomeFeedPage, {
      props: {
        feedData: sampleFeedData,
        metaData: {
          ...sampleMetaData,
          latestSnapshotDate: "2026-02-28",
          snapshotCount: 9,
          itemCount: 999,
          windowCounts: {
            today: 99,
            last7: 99,
            previous7: 99,
            month: 99
          }
        }
      }
    });

    expect(html).toContain("What&#39;s New In Homebrew");
    expect(html).toContain("Latest snapshot");
    expect(html).toContain("Published items:</strong> 4");
    expect(html).toContain("ripgrep");
    expect(html).toContain("Today");
    expect(html).toContain("Last 7 Days");
    expect(html).toContain("Previous 7 Days");
    expect(html).toContain("This Month");
    expect(html).toContain("All changes");
    expect(html).toContain("New");
    expect(html).toContain("Updated");
    expect(html).toContain("Fri, Mar 6, 2026");
    expect(html).not.toContain("feed-card__date");
    expect(html).not.toContain("Snapshots retained");
  });

  it("renders with feed data alone when meta is missing", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HomeFeedPage, {
      props: {
        feedData: sampleFeedData
      }
    });

    expect(html).toContain("Latest snapshot");
    expect(html).toContain("Published items:</strong> 4");
    expect(html).toContain("Last 7 Days");
    expect(html).toContain("Fri, Mar 6, 2026");
  });

  it("explains the bootstrap state when only one trusted snapshot exists", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HomeFeedPage, {
      props: {
        feedData: {
          generatedAt: "2026-03-07T01:11:38.070Z",
          latestSnapshotDate: "2026-03-07",
          items: []
        },
        metaData: {
          generatedAt: "2026-03-07T01:11:38.070Z",
          latestSnapshotDate: "2026-03-07",
          snapshotCount: 1,
          itemCount: 0,
          windowCounts: {
            today: 0,
            last7: 0,
            previous7: 0,
            month: 0
          }
        }
      }
    });

    expect(html).toContain("First snapshot captured");
  });
});
