import { RouteLoading } from "@/components/route-loading";

export default function Loading() {
  return (
    <RouteLoading
      title="Loading ticket"
      description="Fetching ticket details, history, and current workflow state."
    />
  );
}