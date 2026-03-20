import { Suspense } from "react";
import SupportClient from "./support-client";

export default function SupportPage({
  searchParams,
}: {
  searchParams?: { ticketId?: string };
}) {
  const ticketId = searchParams?.ticketId;

  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <SupportClient ticketId={ticketId ?? ""} />
    </Suspense>
  );
}
