import { RouteLoading } from "@/components/route-loading";

export default function Loading() {
  return (
    <RouteLoading
      title="Loading support session"
      description="Preparing ticket context, chat history, billing state, and live-session details."
    />
  );
}
