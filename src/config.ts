export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  webhookSecret: string;
  getmnemoApiKey: string;
  getmnemoWorkspaceId: string;
  port: number;
}

const REQUIRED = [
  "GITHUB_TOKEN",
  "GITHUB_REPO",
  "GITHUB_WEBHOOK_SECRET",
  "GETMNEMO_API_KEY",
  "GETMNEMO_WORKSPACE_ID",
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
    getmnemoApiKey: process.env.GETMNEMO_API_KEY as string,
    getmnemoWorkspaceId: process.env.GETMNEMO_WORKSPACE_ID as string,
    port: Number(process.env.PORT ?? 3000),
  };
}
