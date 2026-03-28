"use client";

import { RepoAddDialog } from "@/components/repos/repo-add-dialog";
import { TrackedReposList } from "@/components/repos/tracked-repos-list";

export default function ReposPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tracked Repositories</h2>
          <p className="text-sm text-muted-foreground">
            Manage which repositories are tracked in Giraf.
          </p>
        </div>
        <RepoAddDialog />
      </div>
      <TrackedReposList />
    </div>
  );
}
