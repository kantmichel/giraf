import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function IssuesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Welcome, {session.user.githubUsername || session.user.name}</h1>
        <p className="mt-2 text-muted-foreground">
          Issues view coming in Stage 2. You are authenticated.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Press <kbd>d</kbd> to toggle dark mode
        </p>
      </div>
    </div>
  );
}
