<p align="center">
  <img src="gemini-wide-hd.png" alt="Gira" width="100%" />
</p>

<h1 align="center">Gira</h1>

<p align="center">
  <strong> A unified issue management layer on top of GitHub.</strong>
</p>

<p align="center">
  Aggregate issues across multiple repositories into a single, Notion-style interface.<br/>
  GitHub remains the source of truth. Gira is for viewing, triaging, and managing.
</p>

---

## Features

- **Multi-repo aggregation** — Track issues from multiple GitHub repos in one view
- **Table view** — Sortable columns: status, priority, assignee, labels, timestamps
- **Smart filtering** — Filter by repo, status, priority, assignee, search text
- **URL-synced filters** — Share filter states via URL
- **Auto-label setup** — Status and priority labels auto-created on tracked repos
- **Live rate limit** — Monitor GitHub API usage in the footer
- **Dark mode** — System-aware with manual toggle
- **Keyboard shortcuts** — `Cmd+B` sidebar, `D` dark mode (more coming)

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
# Fill in GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, NEXTAUTH_SECRET

# Run dev server
bun dev
```

Create a GitHub OAuth App at [github.com/settings/developers](https://github.com/settings/developers) with callback URL: `http://localhost:3000/api/auth/callback/github`

## Roadmap

- [x] **Stage 1** — Scaffolding, auth, database
- [x] **Stage 2** — App shell, sidebar, layout
- [x] **Stage 3** — GitHub client, repo management
- [x] **Stage 4** — Issues table view, filters, sorting
- [x] **Stage 5** — Issue detail sidebar, inline editing
- [x] **Stage 6** — Triage inbox, My Issues dashboard
- [x] **Stage 7** — Command palette, keyboard navigation
- [x] **Stage 8** — Responsive polish, error handling

## License

AGPL-3.0
