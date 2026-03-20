import NewTicketClient from "./new-ticket-client";

export default function NewTicketPage({
  searchParams,
}: {
  searchParams?: { incidentType?: string | string[] };
}) {
  const rawIncidentType = Array.isArray(searchParams?.incidentType)
    ? searchParams?.incidentType[0]
    : searchParams?.incidentType;

  return <NewTicketClient initialIncidentType={rawIncidentType || "general"} />;
}
