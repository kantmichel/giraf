import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PlanView } from "@/components/plan/plan-view";

export default function PlanPage() {
  // PlanView reads the month and person from the URL, which needs a boundary.
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <PlanView />
    </Suspense>
  );
}
