import { describe, it, expect, vi } from "vitest";
import { ingestEntity } from "./ingest.js";
import { backfillIssuesAndPRs } from "./backfill.js";

describe("ingestEntity", () => {
  it("forwards entity to memory.add with metadata", async () => {
    const add = vi.fn(async () => undefined);
    await ingestEntity({ add } as unknown as Parameters<typeof ingestEntity>[0], {
      entityType: "issue",
      number: 7,
      title: "Bug",
      body: "Something broke",
      state: "open",
      author: "alice",
      url: "https://github.com/o/r/issues/7",
      owner: "o",
      repo: "r",
      updatedAt: "2025-01-01T00:00:00Z",
    });
    expect(add).toHaveBeenCalledOnce();
    const [content, opts] = add.mock.calls[0];
    expect(content).toContain("Bug");
    expect(opts).toMatchObject({
      metadata: { source: "github", entityType: "issue", number: 7, owner: "o", repo: "r" },
    });
  });
});

describe("backfillIssuesAndPRs", () => {
  it("paginates and distinguishes PRs from issues", async () => {
    const data = [
      {
        number: 1,
        title: "Issue A",
        body: "",
        state: "open",
        user: { login: "alice" },
        html_url: "u1",
        updated_at: "2025-01-01",
        pull_request: undefined,
      },
      {
        number: 2,
        title: "PR B",
        body: "",
        state: "closed",
        user: { login: "bob" },
        html_url: "u2",
        updated_at: "2025-01-02",
        pull_request: { url: "..." },
      },
    ];
    const listForRepo = vi
      .fn()
      .mockResolvedValueOnce({ data })
      .mockResolvedValueOnce({ data: [] });
    const octokit = { issues: { listForRepo } } as unknown as Parameters<
      typeof backfillIssuesAndPRs
    >[0]["octokit"];
    const add = vi.fn(async () => undefined);
    const memory = { add } as unknown as Parameters<typeof backfillIssuesAndPRs>[0]["memory"];
    const result = await backfillIssuesAndPRs({
      octokit,
      memory,
      owner: "o",
      repo: "r",
      perPage: 100,
    });
    expect(result.issues).toBe(1);
    expect(result.pullRequests).toBe(1);
    expect(result.lastUpdatedAt).toBe("2025-01-02");
    expect(add).toHaveBeenCalledTimes(2);
  });
});
