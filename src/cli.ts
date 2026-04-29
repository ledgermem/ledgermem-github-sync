#!/usr/bin/env node
import "dotenv/config";
import { Octokit } from "@octokit/rest";
import { Mnemo } from "@getmnemo/memory";
import { loadConfig } from "./config.js";
import { backfillIssuesAndPRs } from "./backfill.js";

async function main(): Promise<void> {
  const cfg = loadConfig();
  const octokit = new Octokit({ auth: cfg.token });
  const memory = new Mnemo({
    apiKey: cfg.getmnemoApiKey,
    workspaceId: cfg.getmnemoWorkspaceId,
  });
  const result = await backfillIssuesAndPRs({
    octokit,
    memory,
    owner: cfg.owner,
    repo: cfg.repo,
  });
  process.stdout.write(
    `github-sync backfill done: issues=${result.issues} prs=${result.pullRequests}\n`,
  );
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`backfill failed: ${msg}\n`);
  process.exit(1);
});
