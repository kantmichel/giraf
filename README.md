<p align="center">
  <img src="giraf-wide-banner-hd.png" alt="Giraf" width="100%" />
</p>

<h1 align="center">Giraf</h1>

<p align="center">
  <strong>A giraffe's-eye view of your GitHub issues.</strong>
</p>

<p align="center">
  Giraf aggregates issues across multiple GitHub repositories into a single Notion-style interface with table and kanban views, triage workflows, and keyboard-first navigation.<br/>
  GitHub remains the source of truth. Giraf is for viewing, triaging, and managing.
</p>

---

## Features

- **Multi-repo aggregation** — Track issues from multiple GitHub repos in one view
- **Table + Kanban views** — Notion-style view switching with drag-and-drop
- **Triage inbox** — Review, accept, decline, or snooze new issues
- **My Issues** — Personal dashboard with drag-and-drop between Active and Up Next
- **Smart filtering** — Filter by repo, status, priority, assignee, search text
- **URL-synced filters** — Share filter states via URL
- **Issue detail sidebar** — Markdown rendering, comments, inline metadata editing
- **Command palette** — `Cmd+K` to search issues, navigate, and run actions
- **Keyboard shortcuts** — Navigate the entire app without a mouse
- **Auto-label setup** — Status and priority labels auto-created on tracked repos
- **Dark mode** — System-aware with manual toggle
- **Live rate limit** — Monitor GitHub API usage with refresh button

## Tech Stack

| Layer     | Technology                                       |
| --------- | ------------------------------------------------ |
| Framework | Next.js 16 (App Router, Turbopack)               |
| Frontend  | React 19, shadcn/ui (b0 preset), Tailwind CSS v4 |
| State     | TanStack Query v5                                |
| Data      | GitHub REST API via @octokit/rest                |
| Database  | SQLite via better-sqlite3                        |
| Auth      | NextAuth.js v4 (GitHub OAuth)                    |
| Runtime   | Bun                                              |

## Getting Started

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env.local

# Generate a NextAuth secret
openssl rand -base64 32
# Copy the output into .env.local as NEXTAUTH_SECRET="<output>"

# Fill in the rest of .env.local:
# GITHUB_CLIENT_ID=<from GitHub OAuth App>
# GITHUB_CLIENT_SECRET=<from GitHub OAuth App>
# NEXTAUTH_SECRET=<generated above>
# NEXTAUTH_URL=http://localhost:3000

# Run dev server
bun dev
```

Create a GitHub OAuth App at [github.com/settings/developers](https://github.com/settings/developers) with callback URL: `http://localhost:3000/api/auth/callback/github`

## License

AGPL-3.0
