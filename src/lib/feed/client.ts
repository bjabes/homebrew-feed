import { hydrateFeedPage } from "./browser";
import type { FeedData, FeedMeta } from "./types";

const feedDataElement = document.getElementById("feed-data");
const metaDataElement = document.getElementById("feed-meta");
const feedData = feedDataElement?.textContent ? (JSON.parse(feedDataElement.textContent) as FeedData) : null;
const metaData = metaDataElement?.textContent
  ? (JSON.parse(metaDataElement.textContent) as FeedMeta | null)
  : null;

if (feedData) {
  hydrateFeedPage(document, feedData, metaData);
}
