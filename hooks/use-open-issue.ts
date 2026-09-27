"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

export interface IssueRef {
  repo: { name: string };
  number: number;
}

/**
 * Opens an issue's detail drawer from anywhere outside the issues page — the
 * command palette, a toast — by putting it in the /issues URL, which is what
 * drives the drawer. On /issues the filters you are looking at are kept; from
 * anywhere else the page starts clean, since those params mean nothing there.
 *
 * The location is read when the callback runs, not when it renders: a toast's
 * link may be clicked long after it appeared, and must not bring back the
 * filters you had then.
 */
export function useOpenIssue() {
  const router = useRouter();

  return useCallback(
    (issue: IssueRef) => {
      const { pathname, search } = window.location;
      const params = pathname === "/issues" ? new URLSearchParams(search) : new URLSearchParams();
      params.set("repo", issue.repo.name);
      params.set("issue", String(issue.number));
      router.push(`/issues?${params.toString()}`);
    },
    [router]
  );
}
