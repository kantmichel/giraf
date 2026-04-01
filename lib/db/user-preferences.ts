import { db } from "./index";

export interface UserPreferences {
  preferred_view: "list" | "table" | "kanban";
}

const DEFAULTS: UserPreferences = {
  preferred_view: "list",
};

export function getUserPreferences(
  workspaceId: string,
  githubUsername: string
): UserPreferences {
  const row = db
    .prepare(
      "SELECT preferred_view FROM user_preferences WHERE workspace_id = ? AND github_username = ?"
    )
    .get(workspaceId, githubUsername) as UserPreferences | undefined;
  return row ?? DEFAULTS;
}

export function setUserPreferences(
  workspaceId: string,
  githubUsername: string,
  prefs: Partial<UserPreferences>
): void {
  const current = getUserPreferences(workspaceId, githubUsername);
  const merged = { ...current, ...prefs };

  db.prepare(
    `INSERT INTO user_preferences (workspace_id, github_username, preferred_view)
     VALUES (?, ?, ?)
     ON CONFLICT(workspace_id, github_username)
     DO UPDATE SET preferred_view = excluded.preferred_view`
  ).run(workspaceId, githubUsername, merged.preferred_view);
}
