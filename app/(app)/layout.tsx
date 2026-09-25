import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { SIDEBAR_COOKIE_NAME } from "@/components/ui/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // SidebarProvider writes this cookie on every toggle but cannot read it — it
  // runs on the client, after the server has already decided what to render.
  // Reading it here is what makes a collapsed sidebar survive a reload, and it
  // keeps the server's markup matching what the client is about to hydrate.
  const sidebarState = (await cookies()).get(SIDEBAR_COOKIE_NAME)?.value;

  return (
    <AppShell defaultSidebarOpen={sidebarState !== "false"}>{children}</AppShell>
  );
}
