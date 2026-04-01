"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function MyIssuesRedirect() {
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    const username = session?.user?.githubUsername;
    const url = username ? `/issues?assignees=${username}` : "/issues";
    router.replace(url);
  }, [session, router]);

  return null;
}
