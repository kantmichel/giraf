"use client";

import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardProps {
  title: string;
  size: "full" | "mini";
  isSelected?: boolean;
  onToggleSelected?: () => void;
  isLoading?: boolean;
  children: React.ReactNode;
}

export function MetricCard({
  title,
  size,
  isSelected,
  onToggleSelected,
  isLoading,
  children,
}: MetricCardProps) {
  if (size === "mini") {
    return (
      <Card size="sm" className="gap-0">
        <CardHeader className="pb-1">
          <CardTitle className="text-[11px] font-medium text-muted-foreground truncate">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? <Skeleton className="h-6 w-16" /> : children}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {onToggleSelected !== undefined && (
          <CardAction>
            <Switch
              checked={isSelected}
              onCheckedChange={onToggleSelected}
              aria-label={`Show ${title} on issues page`}
            />
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
