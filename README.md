# @ledgermem/github-sync

LedgerMem connector for GitHub. Indexes a repo's issues, pull requests, and discussions into your LedgerMem workspace — both via one-shot backfill CLI and live webhook server.

## Install

```bash
npm install -g @ledgermem/github-sync
```

## Setup

1. Create a GitHub Personal Access Token (or App token) with `repo` + `read:discussion` scopes.
2. Configure a repo webhook pointing at `https://your-host/webhooks/github` with secret matching `GITHUB_WEBHOOK_SECRET`. Subscribe to **Issues**, **Pull requests**, **Discussions**.
3. Get your LedgerMem API key + workspace ID.
4. Copy `.env.example` to `.env`.

## Run

```bash
# One-shot backfill (issues + PRs):
github-sync

# Webhook server (live sync):
npm start
```

## Env vars

| Variable | Required | Description |
| --- | --- | --- |
| `GITHUB_TOKEN` | yes | GitHub PAT or App token |
| `GITHUB_REPO` | yes | `owner/repo` to sync |
| `GITHUB_WEBHOOK_SECRET` | yes | Shared secret for webhook signature verification |
| `LEDGERMEM_API_KEY` | yes | LedgerMem API key |
| `LEDGERMEM_WORKSPACE_ID` | yes | LedgerMem workspace ID |
| `PORT` | no | Webhook server port (default 3000) |

## Memory metadata

- `source: "github"`
- `owner`
- `repo`
- `entityType` (`issue` | `pull_request` | `discussion`)
- `number`
- `title`
- `state`
- `author`
- `url`

## License

MIT
