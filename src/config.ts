export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  webhookSecret: string;
  ledgermemApiKey: string;
  ledgermemWorkspaceId: string;
  port: number;
}

const REQUIRED = [
  "GITHUB_TOKEN",
  "GITHUB_REPO",
  "GITHUB_WEBHOOK_SECRET",
  "LEDGERMEM_API_KEY",
  "LEDGERMEM_WORKSPACE_ID",
] as const;

export function loadConfig(): GitHubConfig {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
  const repo = process.env.GITHUB_REPO as string;
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    throw new Error(`GITHUB_REPO must be in 'owner/repo' form, got '${repo}'`);
  }
  return {
    token: process.env.GITHUB_TOKEN as string,
    owner,
    repo: name,
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET as string,
    ledgermemApiKey: process.env.LEDGERMEM_API_KEY as string,
    ledgermemWorkspaceId: process.env.LEDGERMEM_WORKSPACE_ID as string,
    port: Number(process.env.PORT ?? 3000),
  };
}
