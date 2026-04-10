"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  BarChart3,
  Bot,
  Inbox,
  LayoutList,
  ListTodo,
  GitFork,
  Settings,
  HelpCircle,
  ScrollText,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useTriageCount } from "@/hooks/use-triage";
import { usePriorityReview } from "@/hooks/use-priority-review";
import { UserMenu } from "./user-menu";

const triageNav = {
  title: "Triage",
  url: "/triage",
  icon: Inbox,
  badge: true,
};


const managementNav = [
  {
    title: "Repos",
    url: "/repos",
    icon: GitFork,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Help",
    url: "/help",
    icon: HelpCircle,
  },
  {
    title: "Changelog",
    url: "/changelog",
    icon: ScrollText,
  },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { data: triageData } = useTriageCount();
  const { data: reviewData } = usePriorityReview();

  const username = session?.user?.githubUsername;
  const myIssuesUrl = username ? `/issues?assignees=${username}` : "/issues";
  const assigneesParam = searchParams.get("assignees");
  const isMyIssuesActive = pathname === "/issues" && assigneesParam === username;

  const hasReviewIssues = reviewData && (
    reviewData.overBudget.critical.over > 0 ||
    reviewData.overBudget.high.over > 0 ||
    reviewData.overBudget.medium.over > 0 ||
    reviewData.staleIssues.length > 0
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/issues">
                <img
                  src="/giraf-face-square.ico"
                  alt="Giraf"
                  className="size-8 rounded-lg"
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Giraf</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Issue Manager
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === triageNav.url}
                  tooltip={triageNav.title}
                >
                  <Link href={triageNav.url}>
                    <triageNav.icon />
                    <span>{triageNav.title}</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuBadge>
                  <span className="flex items-center gap-1.5">
                    {hasReviewIssues && (
                      <span className="size-2 shrink-0 rounded-full bg-yellow-500" title="Priority review needed" />
                    )}
                    {triageData && triageData.count > 0 && (
                      <span>{triageData.count}</span>
                    )}
                  </span>
                </SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Issues</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/dashboard"}
                  tooltip="Dashboard"
                >
                  <Link href="/dashboard">
                    <BarChart3 />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isMyIssuesActive}
                  tooltip="My Issues"
                >
                  <Link href={myIssuesUrl}>
                    <ListTodo />
                    <span>My Issues</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/issues" && !isMyIssuesActive}
                  tooltip="All Issues"
                >
                  <Link href="/issues">
                    <LayoutList />
                    <span>All Issues</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/agents"}
                  tooltip="Agents"
                >
                  <Link href="/agents">
                    <Bot />
                    <span>Agents</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
