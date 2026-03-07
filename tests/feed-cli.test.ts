// @vitest-environment node

import packageJson from "../package.json";
import { describe, expect, it } from "vitest";

describe("feed:update script", () => {
  it("uses the Node loader form instead of the tsx CLI", () => {
    expect(packageJson.scripts["feed:update"]).toBe("node --import tsx scripts/update-feed.ts");
  });
});
