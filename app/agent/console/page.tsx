import AgentConsoleClient from "./agent-console-client";

export default function AgentConsolePage({
  searchParams,
}: {
  searchParams?: { ticketId?: string | string[] };
}) {
  const rawTicketId = Array.isArray(searchParams?.ticketId)
    ? searchParams?.ticketId[0]
    : searchParams?.ticketId;

  return <AgentConsoleClient ticketId={rawTicketId || null} />;
}
