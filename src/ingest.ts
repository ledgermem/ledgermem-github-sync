import type { LedgerMem } from "@ledgermem/memory";

export interface MemoryClient {
  add: LedgerMem["add"];
}

export type GitHubEntityType = "issue" | "pull_request" | "discussion";

export interface GitHubEntity {
  entityType: GitHubEntityType;
  number: number;
  title: string;
  body: string;
  state: string;
  author: string;
  url: string;
  owner: string;
  repo: string;
  updatedAt?: string;
}

export async function ingestEntity(
  memory: MemoryClient,
  entity: GitHubEntity,
): Promise<void> {
  const content = `${entity.title}\n\n${entity.body}`.trim();
  await memory.add(content, {
    metadata: {
      source: "github",
      owner: entity.owner,
      repo: entity.repo,
      entityType: entity.entityType,
      number: entity.number,
      title: entity.title,
      state: entity.state,
      author: entity.author,
      url: entity.url,
      updatedAt: entity.updatedAt ?? "",
    },
  });
}
