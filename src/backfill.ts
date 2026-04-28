import { Octokit } from "@octokit/rest";
import { ingestEntity, type MemoryClient } from "./ingest.js";

export interface BackfillOptions {
  octokit: Octokit;
  memory: MemoryClient;
  owner: string;
  repo: string;
  perPage?: number;
  /** ISO-8601 timestamp; only items updated at or after this are returned. */
  since?: string;
  /** Hard cap on pages to prevent runaway pagination. Default 1000. */
  maxPages?: number;
}

export interface BackfillResult {
  issues: number;
  pullRequests: number;
  /**
   * Most recent `updated_at` observed across all ingested items. Callers
   * persisting this for use as the next run's `since` should bump it by 1ms
   * via {@link nextSince} — GitHub's `since` filter is inclusive, so
   * passing the raw watermark re-ingests the boundary item every run.
   */
  lastUpdatedAt: string | null;
}

/**
 * GitHub's `issues.listForRepo` `since` filter returns items updated at
 * **or after** the given timestamp. Persisting `lastUpdatedAt` directly as
 * the next cursor causes the boundary item to be re-fetched and re-ingested
 * on every subsequent run. Add 1ms so the next run starts strictly after
 * the last item we saw.
 */
export function nextSince(lastUpdatedAt: string | null): string | null {
  if (!lastUpdatedAt) return null;
  const t = Date.parse(lastUpdatedAt);
  if (!Number.isFinite(t)) return lastUpdatedAt;
  return new Date(t + 1).toISOString();
}

export async function backfillIssuesAndPRs(
  opts: BackfillOptions,
): Promise<BackfillResult> {
  const perPage = opts.perPage ?? 100;
  const maxPages = opts.maxPages ?? 1000;
  let issues = 0;
  let prs = 0;
  let page = 1;
  let lastUpdatedAt: string | null = null;
  // GitHub returns issues + PRs in /issues; PRs are flagged with `pull_request`.
  while (page <= maxPages) {
    const res = await opts.octokit.issues.listForRepo({
      owner: opts.owner,
      repo: opts.repo,
      state: "all",
      per_page: perPage,
      page,
      sort: "updated",
      direction: "asc",
      ...(opts.since ? { since: opts.since } : {}),
    });
    if (res.data.length === 0) break;
    for (const item of res.data) {
      const isPR = Boolean(item.pull_request);
      await ingestEntity(opts.memory, {
        entityType: isPR ? "pull_request" : "issue",
        number: item.number,
        title: item.title,
        body: item.body ?? "",
        state: item.state,
        author: item.user?.login ?? "unknown",
        url: item.html_url,
        owner: opts.owner,
        repo: opts.repo,
        updatedAt: item.updated_at,
      });
      if (isPR) prs += 1;
      else issues += 1;
      if (item.updated_at && (!lastUpdatedAt || item.updated_at > lastUpdatedAt)) {
        lastUpdatedAt = item.updated_at;
      }
    }
    if (res.data.length < perPage) break;
    page += 1;
  }
  return { issues, pullRequests: prs, lastUpdatedAt };
}
