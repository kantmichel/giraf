"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { IssueDetailHeader } from "./issue-detail-header";
import { IssueDetailMetadata } from "./issue-detail-metadata";
import { IssueDetailBody } from "./issue-detail-body";
import type { NormalizedIssue } from "@/types/github";

interface IssueDetailSidebarProps {
  issue: NormalizedIssue | null;
  open: boolean;
  onClose: () => void;
}

export function IssueDetailSidebar({
  issue,
  open,
  onClose,
}: IssueDetailSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[600px] sm:max-w-[45vw] overflow-hidden p-0"
        showCloseButton={false}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{issue?.title ?? "Issue Detail"}</SheetTitle>
          <SheetDescription>Issue detail view</SheetDescription>
        </SheetHeader>
        {issue && (
          <div className="flex h-full w-full min-w-0 flex-col">
            <div className="sticky top-0 z-10 border-b bg-popover px-6 py-4">
              <IssueDetailHeader issue={issue} onClose={onClose} />
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-6 px-6 py-6">
                <IssueDetailMetadata issue={issue} />
                <Separator />
                <IssueDetailBody issue={issue} />
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
