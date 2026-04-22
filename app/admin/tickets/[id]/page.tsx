"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppLayout } from "@/app/app-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { AdminMagicLinksPanel } from "@/components/admin/magic-links-panel";

type TicketDetail = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  agentAlias: string;
  creatorEmail: string;
  assignedAgentEmail: string | null;
  incidentTypeSelected: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function AdminTicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/tickets?search=${encodeURIComponent(params.id)}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to load");
        const found = (json.tickets || []).find(
          (t: any) => t.id === params.id,
        );
        if (!cancelled) {
          if (found) setTicket(found);
          else setError("Ticket not found");
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load ticket");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  return (
    <AppLayout>
      <div className="px-4 py-8 sm:px-6 xl:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <Button variant="ghost" size="sm" asChild className="gap-1">
              <Link href="/admin/tickets">
                <ArrowLeft className="h-4 w-4" /> All tickets
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    {ticket?.subject || (loading ? "Loading…" : "Ticket")}
                  </CardTitle>
                  <CardDescription className="font-mono text-xs">
                    {params.id}
                  </CardDescription>
                </div>
                {ticket ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Badge variant="secondary">{ticket.status}</Badge>
                    <Badge variant="outline">{ticket.priority}</Badge>
                  </div>
                ) : null}
              </div>
            </CardHeader>
            {ticket ? (
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">
                    Customer
                  </div>
                  <div className="font-medium">{ticket.creatorEmail}</div>
                  <div className="text-xs text-muted-foreground">
                    Alias: {ticket.agentAlias}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">
                    Assigned
                  </div>
                  <div className="font-medium">
                    {ticket.assignedAgentEmail || "Unassigned"}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">
                    Incident
                  </div>
                  <div className="font-medium">
                    {ticket.incidentTypeSelected || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">
                    Updated
                  </div>
                  <div className="font-medium">
                    {new Date(ticket.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/agent/console?ticketId=${ticket.id}`}>
                      Open workspace
                    </Link>
                  </Button>
                </div>
              </CardContent>
            ) : (
              <CardContent className="text-sm text-muted-foreground">
                {loading ? "Loading ticket…" : error || "Ticket not found."}
              </CardContent>
            )}
          </Card>

          <AdminMagicLinksPanel ticketId={params.id} />
        </div>
      </div>
    </AppLayout>
  );
}
