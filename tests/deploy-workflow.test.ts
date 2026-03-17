// @vitest-environment node

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

describe("deploy workflow", () => {
  it("deploys after a successful feed update run and checks out that run's commit", async () => {
    const workflow = await readFile(join(repoRoot, ".github", "workflows", "deploy-site.yml"), "utf8");

    expect(workflow).toContain("workflow_run:");
    expect(workflow).toContain("- Update Feed");
    expect(workflow).toContain("types: [completed]");
    expect(workflow).toContain("branches:");
    expect(workflow).toContain("- main");
    expect(workflow).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(workflow).toContain("ref: ${{ github.event_name == 'workflow_run' && github.event.workflow_run.head_sha || github.sha }}");
  });
});
