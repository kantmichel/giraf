import { db } from "./index";
import { nanoid } from "nanoid";

export interface Workspace {
  id: string;
  name: string;
  github_org: string | null;
  created_at: string;
}

export function createWorkspace(
  name: string,
  githubOrg: string | null
): Workspace {
  const id = nanoid();
  db.prepare(
    "INSERT INTO workspaces (id, name, github_org) VALUES (?, ?, ?)"
  ).run(id, name, githubOrg);
  return { id, name, github_org: githubOrg, created_at: new Date().toISOString() };
}

export function getWorkspace(id: string): Workspace | undefined {
  return db
    .prepare("SELECT * FROM workspaces WHERE id = ?")
    .get(id) as Workspace | undefined;
}

export function getWorkspaceByOrg(githubOrg: string): Workspace | undefined {
  return db
    .prepare("SELECT * FROM workspaces WHERE github_org = ?")
    .get(githubOrg) as Workspace | undefined;
}

export function findOrCreateWorkspace(
  githubUsername: string,
  githubOrg?: string | null
): Workspace {
  const orgName = githubOrg || githubUsername;
  const existing = getWorkspaceByOrg(orgName);
  if (existing) return existing;
  return createWorkspace(orgName, orgName);
}

export function addWorkspaceMember(
  workspaceId: string,
  githubUserId: string,
  role: "admin" | "member" | "viewer",
  invitedBy?: string
): void {
  db.prepare(
    `INSERT OR IGNORE INTO workspace_members (workspace_id, github_user_id, role, invited_by)
     VALUES (?, ?, ?, ?)`
  ).run(workspaceId, githubUserId, role, invitedBy || null);
}
