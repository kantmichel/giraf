import { getWorkspaceByOrg, type Workspace } from "./workspaces";

export function getWorkspaceForUser(githubUsername: string): Workspace {
  const workspace = getWorkspaceByOrg(githubUsername);
  if (!workspace) {
    throw new Error(`Workspace not found for user: ${githubUsername}`);
  }
  return workspace;
}
