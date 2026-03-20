import { RouteLoading } from "@/components/route-loading";

export default function Loading() {
  return (
    <RouteLoading
      title="Loading tickets"
      description="Fetching your current ticket list and status."
    />
  );
}