// @vitest-environment node

import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import HomeFeedPage from "../src/components/HomeFeedPage.astro";
import { sampleFeedData, sampleMetaData } from "./fixtures/feed";

describe("HomeFeedPage", () => {
  it("renders the latest day view and exposes snapshot metadata", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HomeFeedPage, {
      props: {
        feedData: sampleFeedData,
        metaData: sampleMetaData
      }
    });

    expect(html).toContain("What&#39;s New In Homebrew");
    expect(html).toContain("Latest snapshot");
    expect(html).toContain("ripgrep");
    expect(html).toContain("Today");
    expect(html).toContain("This Week");
    expect(html).toContain("This Month");
  });

  it("explains the bootstrap state when only one snapshot exists", async () => {
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
            week: 0,
            month: 0
          }
        }
      }
    });

    expect(html).toContain("First snapshot captured");
  });
});
