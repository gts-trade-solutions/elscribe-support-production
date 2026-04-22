import TicketLinkClient from "./ticket-link-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function TicketLinkPage({
  params,
}: {
  params: { token: string };
}) {
  return <TicketLinkClient token={decodeURIComponent(params.token)} />;
}
