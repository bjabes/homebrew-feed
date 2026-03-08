import { deriveFeedMeta, filterFeedItems, groupFeedItemsByDate } from "./core";
import type {
  FeedBrowserState,
  FeedData,
  FeedItem,
  FeedMeta,
  FeedWindow
} from "./types";

const WINDOW_LABELS: Record<FeedWindow, string> = {
  today: "Today",
  last7: "Last 7 Days",
  previous7: "Previous 7 Days",
  month: "This Month"
};

interface FeedBrowserModel {
  state: FeedBrowserState;
  viewMeta: ReturnType<typeof deriveFeedMeta>;
  visibleItems: FeedItem[];
  visibleGroups: ReturnType<typeof groupFeedItemsByDate>;
}

function parseWindow(value: string | null): FeedWindow {
  if (value === "last7" || value === "previous7" || value === "month") {
    return value;
  }

  return "today";
}

function parseType(value: string | null): FeedBrowserState["type"] {
  if (value === "formula" || value === "cask") {
    return value;
  }

  return "all";
}

function parseSearchParams(search: string): FeedBrowserState {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);

  return {
    window: parseWindow(params.get("window")),
    type: parseType(params.get("type")),
    q: params.get("q")?.trim() ?? ""
  };
}

export function formatFeedDate(date: string | null): string {
  if (!date) {
    return "No snapshot yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildSearch(value: FeedBrowserState): string {
  const params = new URLSearchParams();

  if (value.window !== "today") {
    params.set("window", value.window);
  }

  if (value.type !== "all") {
    params.set("type", value.type);
  }

  if (value.q) {
    params.set("q", value.q);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

function renderFeedCardMarkup(item: FeedItem): string {
  return `
    <article class="feed-card">
      <div class="feed-card__meta">
        <span class="chip chip--${item.kind}">${item.kind}</span>
        <span class="chip chip--${item.changeType}">${item.changeType}</span>
      </div>
      <div class="feed-card__body">
        <h3><a href="${escapeHtml(item.packageUrl)}">${escapeHtml(item.name)}</a></h3>
        <p class="feed-card__token">${escapeHtml(item.token)}</p>
        <p class="feed-card__version">
          ${escapeHtml(item.previousVersion ?? "new")} &rarr; ${escapeHtml(item.currentVersion)}
        </p>
      </div>
    </article>
  `;
}

function buildModel(feedData: FeedData, state: FeedBrowserState, metaData?: FeedMeta | null): FeedBrowserModel {
  const viewMeta = deriveFeedMeta(feedData, metaData);
  const visibleItems = filterFeedItems(feedData.items, state, viewMeta.browseAnchorDate);

  return {
    state,
    viewMeta,
    visibleItems,
    visibleGroups: groupFeedItemsByDate(visibleItems)
  };
}

export function createFeedBrowserModel(
  feedData: FeedData,
  options: {
    search: string;
    metaData?: FeedMeta | null;
  }
): FeedBrowserModel {
  const state = parseSearchParams(options.search);

  return buildModel(feedData, state, options.metaData);
}

export function renderResultsSummary(
  count: number,
  window: FeedWindow,
  latestSnapshotDate: string | null
): string {
  return `${count} packages in ${WINDOW_LABELS[window]} ending ${formatFeedDate(latestSnapshotDate)}`;
}

export function renderEmptyStateMarkup(viewMeta: ReturnType<typeof deriveFeedMeta>): string {
  if (viewMeta.trustedSnapshotCount === 1 && viewMeta.browseAnchorDate) {
    return `
      <div class="empty-state">
        <p>First snapshot captured. Changes will appear after the next daily refresh.</p>
      </div>
    `;
  }

  return `
    <div class="empty-state">
      <p>No packages matched this view yet.</p>
    </div>
  `;
}

export function renderFeedListMarkup(model: FeedBrowserModel, _metaData?: FeedMeta | null): string {
  if (model.visibleGroups.length === 0) {
    return renderEmptyStateMarkup(model.viewMeta);
  }

  return model.visibleGroups
    .map(
      (group) => `
        <section class="feed-group">
          <h2 class="feed-group__heading">${escapeHtml(formatFeedDate(group.date))}</h2>
          <div class="feed-group__items">
            ${group.items.map((item) => renderFeedCardMarkup(item)).join("")}
          </div>
        </section>
      `
    )
    .join("");
}

export function hydrateFeedPage(
  doc: Document,
  feedData: FeedData,
  metaData?: FeedMeta | null,
  options: {
    search?: string;
  } = {}
): void {
  const root = doc.querySelector<HTMLElement>("[data-feed-app]");
  const windowControls = doc.querySelector<HTMLElement>("[data-window-controls]");
  const typeFilter = doc.querySelector<HTMLSelectElement>("[data-type-filter]");
  const searchInput = doc.querySelector<HTMLInputElement>("[data-search-input]");
  const resultsSummary = doc.querySelector<HTMLElement>("[data-results-summary]");
  const feedList = doc.querySelector<HTMLElement>("[data-feed-list]");

  if (!root || !windowControls || !typeFilter || !searchInput || !resultsSummary || !feedList) {
    return;
  }

  let state = createFeedBrowserModel(feedData, {
    search: options.search ?? doc.defaultView?.location.search ?? ""
  }).state;

  const render = () => {
    const model = buildModel(feedData, state, metaData);

    windowControls.innerHTML = (["today", "last7", "previous7", "month"] as const)
      .map((window) => {
        const count = model.viewMeta.windowCounts[window];
        const activeClass = state.window === window ? "is-active" : "";

        return `
          <button class="window-pill ${activeClass}" data-window="${window}" type="button">
            ${WINDOW_LABELS[window]} <span>${count}</span>
          </button>
        `;
      })
      .join("");

    if (typeFilter.options.length === 0) {
      typeFilter.innerHTML = `
        <option value="all">All packages</option>
        <option value="formula">Formulae</option>
        <option value="cask">Casks</option>
      `;
    }

    typeFilter.value = state.type;
    searchInput.value = state.q;
    searchInput.setAttribute("value", state.q);
    resultsSummary.textContent = renderResultsSummary(
      model.visibleItems.length,
      state.window,
      model.viewMeta.browseAnchorDate
    );
    feedList.innerHTML = renderFeedListMarkup(model);

    const search = buildSearch(state);
    const history = doc.defaultView?.history;
    const location = doc.defaultView?.location;

    if (history && location) {
      history.replaceState({}, "", `${location.pathname}${search}`);
    }

    for (const button of windowControls.querySelectorAll<HTMLButtonElement>("[data-window]")) {
      button.addEventListener("click", () => {
        state = {
          ...state,
          window: parseWindow(button.dataset.window ?? null)
        };
        render();
      });
    }
  };

  typeFilter.addEventListener("change", () => {
    state = {
      ...state,
      type: parseType(typeFilter.value)
    };
    render();
  });

  searchInput.addEventListener("input", () => {
    state = {
      ...state,
      q: searchInput.value.trim()
    };
    render();
  });

  render();
}
