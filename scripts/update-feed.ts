import { runFeedUpdate } from "../src/lib/feed/update";

function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const now = process.env.FEED_NOW ? new Date(process.env.FEED_NOW) : new Date();
const generatedAt = now.toISOString();
const date = process.env.FEED_DATE ?? utcDateString(now);

const result = await runFeedUpdate({
  date,
  generatedAt,
  historyDir: new URL("../data/history", import.meta.url).pathname,
  publicDataDir: new URL("../public/data", import.meta.url).pathname
});

console.log(
  JSON.stringify(
    {
      changed: result.changed,
      latestSnapshotDate: result.latestSnapshotDate,
      snapshotPath: result.snapshotPath
    },
    null,
    2
  )
);
