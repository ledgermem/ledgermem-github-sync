import "dotenv/config";
import express, { type Request, type Response } from "express";
import { Webhooks } from "@octokit/webhooks";
import { LedgerMem } from "@ledgermem/memory";
import { loadConfig } from "./config.js";
import { ingestEntity } from "./ingest.js";

export function buildApp(deps: {
  webhookSecret: string;
  memory: { add: LedgerMem["add"] };
  owner: string;
  repo: string;
}): express.Express {
  const webhooks = new Webhooks({ secret: deps.webhookSecret });

  webhooks.on("issues", async ({ payload }) => {
    const issue = payload.issue;
    await ingestEntity(deps.memory, {
      entityType: "issue",
      number: issue.number,
      title: issue.title,
      body: issue.body ?? "",
      state: issue.state,
      author: issue.user?.login ?? "unknown",
      url: issue.html_url,
      owner: deps.owner,
      repo: deps.repo,
      updatedAt: issue.updated_at,
    });
  });

  webhooks.on("pull_request", async ({ payload }) => {
    const pr = payload.pull_request;
    await ingestEntity(deps.memory, {
      entityType: "pull_request",
      number: pr.number,
      title: pr.title,
      body: pr.body ?? "",
      state: pr.state,
      author: pr.user?.login ?? "unknown",
      url: pr.html_url,
      owner: deps.owner,
      repo: deps.repo,
      updatedAt: pr.updated_at,
    });
  });

  // Force pushes rewrite history; the previously-ingested commits / PR refs
  // may now point at orphaned SHAs. Log so operators can trigger a rebackfill.
  webhooks.on("push", async ({ payload }) => {
    if (payload.forced) {
      process.stderr.write(
        `[github-sync] forced push on ${payload.ref} in ${deps.owner}/${deps.repo}: ` +
          `${payload.before} -> ${payload.after}. Re-run backfill to reconcile.\n`,
      );
    }
  });

  webhooks.on("discussion", async ({ payload }) => {
    const d = payload.discussion;
    await ingestEntity(deps.memory, {
      entityType: "discussion",
      number: d.number,
      title: d.title,
      body: d.body ?? "",
      state: d.state ?? "open",
      author: d.user?.login ?? "unknown",
      url: d.html_url,
      owner: deps.owner,
      repo: deps.repo,
      updatedAt: d.updated_at,
    });
  });

  const app = express();
  // Cap webhook payload size: GitHub's documented max is ~25MB, so 32MB is a
  // safe ceiling. Without a limit, express defaults to 100kb and large
  // discussion bodies / PR diffs are silently rejected.
  app.use(
    express.json({
      limit: "32mb",
      verify: (req, _res, buf) => {
        (req as Request & { rawBody: string }).rawBody = buf.toString("utf8");
      },
    }),
  );

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/webhooks/github", async (req: Request, res: Response) => {
    const id = req.header("x-github-delivery");
    const name = req.header("x-github-event");
    const signature = req.header("x-hub-signature-256");
    const body = (req as Request & { rawBody: string }).rawBody;
    if (!id || !name || !signature || !body) {
      res.status(400).json({ error: "missing headers" });
      return;
    }
    try {
      await webhooks.verifyAndReceive({
        id,
        name: name as Parameters<typeof webhooks.verifyAndReceive>[0]["name"],
        signature,
        payload: body,
      });
      res.status(204).end();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: msg });
    }
  });

  return app;
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  const memory = new LedgerMem({
    apiKey: cfg.ledgermemApiKey,
    workspaceId: cfg.ledgermemWorkspaceId,
  });
  const app = buildApp({
    webhookSecret: cfg.webhookSecret,
    memory,
    owner: cfg.owner,
    repo: cfg.repo,
  });
  app.listen(cfg.port, () => {
    process.stdout.write(`github-sync webhook server on :${cfg.port}\n`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`server failed: ${msg}\n`);
    process.exit(1);
  });
}
