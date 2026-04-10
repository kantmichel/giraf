import type Database from "better-sqlite3";

interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    description: "Initial schema",
    up: (db) => {
      db.exec(`
        CREATE TABLE workspaces (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          github_org TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE tracked_repos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workspace_id TEXT NOT NULL REFERENCES workspaces(id),
          owner TEXT NOT NULL,
          repo TEXT NOT NULL,
          added_by TEXT NOT NULL,
          added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(workspace_id, owner, repo)
        );

        CREATE TABLE api_cache (
          cache_key TEXT PRIMARY KEY,
          response_body TEXT NOT NULL,
          etag TEXT,
          cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL
        );

        CREATE TABLE issue_priority_overrides (
          workspace_id TEXT NOT NULL,
          repo_full_name TEXT NOT NULL,
          issue_number INTEGER NOT NULL,
          priority TEXT NOT NULL CHECK(priority IN ('critical', 'high', 'medium', 'low')),
          set_by TEXT NOT NULL,
          set_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY(workspace_id, repo_full_name, issue_number)
        );

        CREATE TABLE saved_views (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL REFERENCES workspaces(id),
          name TEXT NOT NULL,
          view_type TEXT NOT NULL CHECK(view_type IN ('table', 'kanban', 'list', 'timeline')),
          config JSON NOT NULL,
          created_by TEXT NOT NULL,
          is_default BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE workspace_members (
          workspace_id TEXT NOT NULL REFERENCES workspaces(id),
          github_user_id TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'member', 'viewer')),
          invited_by TEXT,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY(workspace_id, github_user_id)
        );

        CREATE TABLE snoozed_issues (
          workspace_id TEXT NOT NULL,
          repo_full_name TEXT NOT NULL,
          issue_number INTEGER NOT NULL,
          snoozed_by TEXT NOT NULL,
          snoozed_until DATETIME,
          wake_on_activity BOOLEAN DEFAULT TRUE,
          snoozed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY(workspace_id, repo_full_name, issue_number)
        );

        CREATE TABLE issue_relationships (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workspace_id TEXT NOT NULL,
          source_repo TEXT NOT NULL,
          source_issue INTEGER NOT NULL,
          target_repo TEXT NOT NULL,
          target_issue INTEGER NOT NULL,
          relationship_type TEXT NOT NULL CHECK(relationship_type IN ('blocks', 'blocked_by', 'relates_to', 'duplicate_of')),
          created_by TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(workspace_id, source_repo, source_issue, target_repo, target_issue, relationship_type)
        );

        CREATE TABLE triage_state (
          workspace_id TEXT NOT NULL,
          repo_full_name TEXT NOT NULL,
          issue_number INTEGER NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'declined', 'snoozed')),
          triaged_by TEXT,
          triaged_at DATETIME,
          PRIMARY KEY(workspace_id, repo_full_name, issue_number)
        );
      `);
    },
  },
  {
    version: 2,
    description: "Priority budgets and promotion log",
    up: (db) => {
      db.exec(`
        CREATE TABLE priority_budgets (
          workspace_id TEXT NOT NULL,
          github_user_id TEXT NOT NULL,
          critical_max INTEGER NOT NULL DEFAULT 2,
          high_max INTEGER NOT NULL DEFAULT 3,
          medium_max INTEGER NOT NULL DEFAULT 5,
          PRIMARY KEY(workspace_id, github_user_id)
        );

        CREATE TABLE priority_promotions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workspace_id TEXT NOT NULL,
          repo_full_name TEXT NOT NULL,
          issue_number INTEGER NOT NULL,
          from_priority TEXT NOT NULL,
          to_priority TEXT NOT NULL,
          triggered_by_repo TEXT NOT NULL,
          triggered_by_issue INTEGER NOT NULL,
          promoted_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    },
  },
  {
    version: 3,
    description: "Claude-enabled repos",
    up: (db) => {
      db.exec(`
        CREATE TABLE claude_enabled_repos (
          workspace_id TEXT NOT NULL,
          owner TEXT NOT NULL,
          repo TEXT NOT NULL,
          PRIMARY KEY(workspace_id, owner, repo)
        );
      `);
    },
  },
  {
    version: 4,
    description: "Closed issue notifications and watched issues",
    up: (db) => {
      db.exec(`
        CREATE TABLE closed_notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workspace_id TEXT NOT NULL,
          repo_full_name TEXT NOT NULL,
          issue_number INTEGER NOT NULL,
          issue_title TEXT NOT NULL,
          issue_html_url TEXT NOT NULL,
          closed_at TEXT NOT NULL,
          read INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          UNIQUE(workspace_id, repo_full_name, issue_number)
        );

        CREATE TABLE watched_issues (
          workspace_id TEXT NOT NULL,
          github_username TEXT NOT NULL,
          repo_full_name TEXT NOT NULL,
          issue_number INTEGER NOT NULL,
          watched_at TEXT DEFAULT (datetime('now')),
          PRIMARY KEY(workspace_id, github_username, repo_full_name, issue_number)
        );
      `);
    },
  },
  {
    version: 5,
    description: "User preferences",
    up: (db) => {
      db.exec(`
        CREATE TABLE user_preferences (
          workspace_id TEXT NOT NULL,
          github_username TEXT NOT NULL,
          preferred_view TEXT NOT NULL DEFAULT 'list' CHECK(preferred_view IN ('list', 'table', 'kanban')),
          PRIMARY KEY(workspace_id, github_username)
        );
      `);
    },
  },
  {
    version: 6,
    description: "Kanban sort preferences",
    up: (db) => {
      db.exec(`
        ALTER TABLE user_preferences ADD COLUMN kanban_sort TEXT DEFAULT NULL;
      `);
    },
  },
  {
    version: 7,
    description: "Dashboard metrics preferences",
    up: (db) => {
      db.exec(`
        ALTER TABLE user_preferences ADD COLUMN dashboard_metrics TEXT DEFAULT NULL;
        ALTER TABLE user_preferences ADD COLUMN metrics_collapsed INTEGER DEFAULT 0;
      `);
    },
  },
  {
    version: 8,
    description: "Default filter presets",
    up: (db) => {
      db.exec(`
        ALTER TABLE user_preferences ADD COLUMN default_filters TEXT DEFAULT NULL;
      `);
    },
  },
  {
    version: 9,
    description: "Imported agent workflows and workflow run cache",
    up: (db) => {
      db.exec(`
        CREATE TABLE agent_workflows (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workspace_id TEXT NOT NULL REFERENCES workspaces(id),
          repo_owner TEXT NOT NULL,
          repo_name TEXT NOT NULL,
          workflow_id INTEGER NOT NULL,
          workflow_name TEXT NOT NULL,
          workflow_path TEXT NOT NULL,
          display_name TEXT,
          description TEXT,
          stages_json TEXT NOT NULL,
          schedule_crons_json TEXT NOT NULL DEFAULT '[]',
          enabled INTEGER NOT NULL DEFAULT 1,
          imported_at TEXT NOT NULL,
          imported_by TEXT NOT NULL,
          last_synced_at TEXT,
          UNIQUE(workspace_id, repo_owner, repo_name, workflow_id)
        );
        CREATE INDEX idx_agent_workflows_workspace ON agent_workflows(workspace_id);
        CREATE INDEX idx_agent_workflows_enabled ON agent_workflows(enabled);

        CREATE TABLE workflow_runs (
          id INTEGER PRIMARY KEY,
          workspace_id TEXT NOT NULL REFERENCES workspaces(id),
          agent_workflow_id INTEGER REFERENCES agent_workflows(id),
          repo_owner TEXT NOT NULL,
          repo_name TEXT NOT NULL,
          workflow_id INTEGER NOT NULL,
          workflow_name TEXT NOT NULL,
          workflow_path TEXT NOT NULL,
          head_sha TEXT,
          head_branch TEXT,
          event TEXT NOT NULL,
          status TEXT NOT NULL,
          conclusion TEXT,
          html_url TEXT NOT NULL,
          run_number INTEGER,
          run_started_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          actor_login TEXT,
          actor_avatar_url TEXT,
          jobs_json TEXT,
          fetched_at TEXT NOT NULL
        );
        CREATE INDEX idx_workflow_runs_workspace ON workflow_runs(workspace_id);
        CREATE INDEX idx_workflow_runs_agent_workflow ON workflow_runs(agent_workflow_id);
        CREATE INDEX idx_workflow_runs_status ON workflow_runs(status);
        CREATE INDEX idx_workflow_runs_created ON workflow_runs(created_at DESC);

        CREATE TABLE workflow_sync_state (
          workspace_id TEXT NOT NULL,
          agent_workflow_id INTEGER NOT NULL REFERENCES agent_workflows(id),
          last_synced_at TEXT NOT NULL,
          last_run_id INTEGER,
          PRIMARY KEY (workspace_id, agent_workflow_id)
        );
      `);
    },
  },
  {
    version: 10,
    description: "Persistent cache for historical closed issues",
    up: (db) => {
      db.exec(`
        CREATE TABLE cached_closed_issues (
          workspace_id TEXT NOT NULL,
          repo_owner TEXT NOT NULL,
          repo_name TEXT NOT NULL,
          issue_number INTEGER NOT NULL,
          closed_at TEXT NOT NULL,
          issue_json TEXT NOT NULL,
          cached_at TEXT NOT NULL,
          PRIMARY KEY (workspace_id, repo_owner, repo_name, issue_number)
        );
        CREATE INDEX idx_cached_closed_issues_closed_at
          ON cached_closed_issues(workspace_id, repo_owner, repo_name, closed_at DESC);

        CREATE TABLE closed_issues_cache_state (
          workspace_id TEXT NOT NULL,
          repo_owner TEXT NOT NULL,
          repo_name TEXT NOT NULL,
          cache_start TEXT NOT NULL,
          cache_end TEXT NOT NULL,
          last_synced_at TEXT NOT NULL,
          PRIMARY KEY (workspace_id, repo_owner, repo_name)
        );
      `);
    },
  },
];

export function runMigrations(db: Database.Database): void {
  const currentVersion = db.pragma("user_version", { simple: true }) as number;
  const pending = migrations.filter((m) => m.version > currentVersion);

  if (pending.length === 0) return;

  for (const migration of pending) {
    const run = db.transaction(() => {
      migration.up(db);
      db.pragma(`user_version = ${migration.version}`);
    });
    run();
  }
}
