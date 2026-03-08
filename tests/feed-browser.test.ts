// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { createFeedBrowserModel, hydrateFeedPage, renderFeedListMarkup } from "../src/lib/feed/browser";
import { sampleFeedData, sampleMetaData } from "./fixtures/feed";

describe("feed browser", () => {
  it("defaults to today and supports the new rolling browse windows", () => {
    const model = createFeedBrowserModel(sampleFeedData, {
      search: ""
    });

    expect(model.state.window).toBe("today");
    expect(model.visibleItems.map((item) => item.token)).toEqual(["ripgrep", "wget"]);

    const rollingModel = createFeedBrowserModel(
      {
        generatedAt: "2026-03-06T14:00:00.000Z",
        latestSnapshotDate: "2026-03-06",
        items: [
          ...sampleFeedData.items,
          {
            date: "2026-02-25",
            kind: "cask",
            token: "studio-archive",
            name: "Studio Archive",
            changeType: "updated",
            currentVersion: "2.0.0",
            previousVersion: "1.0.0",
            packageUrl: "https://formulae.brew.sh/cask/studio-archive"
          }
        ]
      },
      {
        search: "?window=previous7&type=cask&q=studio"
      }
    );

    expect(rollingModel.state.window).toBe("previous7");
    expect(rollingModel.state.type).toBe("cask");
    expect(rollingModel.state.q).toBe("studio");
    expect(rollingModel.visibleItems.map((item) => item.token)).toEqual(["studio-archive"]);
  });

  it("renders date-grouped markup instead of repeating raw dates on each card", () => {
    const model = createFeedBrowserModel(sampleFeedData, {
      search: "?window=last7"
    });

    const markup = renderFeedListMarkup(model, sampleMetaData);

    expect(markup).toContain("feed-group");
    expect(markup).toContain("Fri, Mar 6, 2026");
    expect(markup).toContain("Wed, Mar 4, 2026");
    expect(markup).not.toContain("feed-card__date");
  });

  it("hydrates the page controls from feed data even when meta is stale", () => {
    document.body.innerHTML = `
      <div data-feed-app>
        <div data-window-controls></div>
        <select data-type-filter></select>
        <input data-search-input />
        <p data-results-summary></p>
        <div data-feed-list></div>
      </div>
    `;

    hydrateFeedPage(
      document,
      sampleFeedData,
      {
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
      },
      {
        search: "?window=month&type=formula&q=nomatch"
      }
    );

    expect(document.querySelector("[data-results-summary]")?.textContent).toContain("0");
    expect(document.querySelector("[data-feed-list]")?.textContent).toContain("No packages");
    expect(document.querySelector("[data-search-input]")?.getAttribute("value")).toBe("nomatch");
    expect(document.querySelector("[data-window-controls]")?.textContent).toContain("Last 7 Days 3");
    expect(document.querySelector("[data-window-controls]")?.textContent).toContain("Previous 7 Days 0");
  });

  it("shows the first-snapshot empty state only when snapshot metadata is trusted", () => {
    document.body.innerHTML = `
      <div data-feed-app>
        <div data-window-controls></div>
        <select data-type-filter></select>
        <input data-search-input />
        <p data-results-summary></p>
        <div data-feed-list></div>
      </div>
    `;

    hydrateFeedPage(
      document,
      {
        generatedAt: "2026-03-07T01:11:38.070Z",
        latestSnapshotDate: "2026-03-07",
        items: []
      },
      {
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
    );

    expect(document.querySelector("[data-feed-list]")?.textContent).toContain("First snapshot captured");
  });
});
