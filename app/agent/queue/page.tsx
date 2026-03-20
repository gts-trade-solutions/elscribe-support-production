import AgentQueueClient from "./agent-queue-client";

export default function AgentQueuePage({
  searchParams,
}: {
  searchParams?: { view?: string | string[] };
}) {
  const rawView = Array.isArray(searchParams?.view)
    ? searchParams?.view[0]
    : searchParams?.view;

  const initialView = rawView === "queue" ? "queue" : "mine";

  return <AgentQueueClient initialView={initialView} />;
}
