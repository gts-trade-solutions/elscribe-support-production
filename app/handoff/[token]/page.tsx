import { verifyHandoffToken } from "@/lib/handoff-token";
import { getPrefillEmailForTicket } from "@/lib/elscribe/handoff-repo";
import HandoffClient from "./handoff-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function HandoffPage({
  params,
}: {
  params: { token: string };
}) {
  const token = decodeURIComponent(params.token);

  let ticketId = "";
  let prefillEmail: string | null = null;

  try {
    const claims = await verifyHandoffToken(token);
    ticketId = claims.ticketId;
    prefillEmail = await getPrefillEmailForTicket(ticketId);
  } catch {
    // invalid token
  }

  return (
    <HandoffClient
      token={token}
      ticketId={ticketId}
      prefillEmail={prefillEmail}
    />
  );
}
