// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { createFeedBrowserModel, hydrateFeedPage } from "../src/lib/feed/browser";
import { sampleFeedData, sampleMetaData } from "./fixtures/feed";

describe("feed browser", () => {
  it("defaults to the latest day and filters by window, type, and search", () => {
    const model = createFeedBrowserModel(sampleFeedData, {
      search: ""
    });

    expect(model.state.window).toBe("today");
    expect(model.visibleItems.map((item) => item.token)).toEqual(["ripgrep", "wget"]);

    const weekModel = createFeedBrowserModel(sampleFeedData, {
      search: "?window=week&type=cask&q=studio"
    });

    expect(weekModel.state.window).toBe("week");
    expect(weekModel.state.type).toBe("cask");
    expect(weekModel.state.q).toBe("studio");
    expect(weekModel.visibleItems.map((item) => item.token)).toEqual(["visual-studio-code"]);
  });

  it("hydrates the page controls and empty states", () => {
    document.body.innerHTML = `
      <div data-feed-app>
        <div data-window-controls></div>
        <select data-type-filter></select>
        <input data-search-input />
        <p data-results-summary></p>
        <div data-feed-list></div>
      </div>
    `;

    hydrateFeedPage(document, sampleFeedData, sampleMetaData, {
      search: "?window=month&type=formula&q=nomatch"
    });

    expect(document.querySelector("[data-results-summary]")?.textContent).toContain("0");
    expect(document.querySelector("[data-feed-list]")?.textContent).toContain("No packages");
    expect(document.querySelector("[data-search-input]")?.getAttribute("value")).toBe("nomatch");
  });
});
