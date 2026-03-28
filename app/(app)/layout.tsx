import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { FooterBar } from "@/components/layout/footer-bar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopBar />
        <div className="min-w-0 flex-1 overflow-auto p-4">
          {children}
        </div>
        <FooterBar />
      </SidebarInset>
    </SidebarProvider>
  );
}
