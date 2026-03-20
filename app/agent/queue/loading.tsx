import { RouteLoading } from "@/components/route-loading";

export default function Loading() {
  return (
    <RouteLoading
      title="Loading agent queue"
      description="Fetching current queue state and available tickets."
    />
  );
}
