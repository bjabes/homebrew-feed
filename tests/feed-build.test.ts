// @vitest-environment node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

describe("build output", () => {
  it("embeds the generated feed data into the built page", async () => {
    execFileSync("pnpm", ["build"], {
      cwd: repoRoot,
      stdio: "pipe"
    });

    const feed = JSON.parse(await readFile(join(repoRoot, "public", "data", "feed.json"), "utf8")) as {
      latestSnapshotDate: string | null;
      items: Array<{
        token: string;
        description?: string;
      }>;
    };
    const html = await readFile(join(repoRoot, "dist", "index.html"), "utf8");
    const describedItem = feed.items.find((item) => item.description);

    expect(feed.items.length).toBeGreaterThan(0);
    expect(feed.latestSnapshotDate).not.toBeNull();
    expect(describedItem).toBeDefined();
    expect(html).toContain(`Latest snapshot:</strong> ${feed.latestSnapshotDate}`);
    expect(html).toContain(describedItem?.description ?? "");
    expect(html).not.toContain('"generatedAt":"1970-01-01T00:00:00.000Z"');
    expect(html).not.toContain('import { hydrateFeedPage } from "../lib/feed/browser";');
    expect(html).not.toContain('src="data:video/mp2t;base64,');
  });
});
