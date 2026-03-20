"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "../../app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Clock,
  CreditCard,
  MessageSquare,
  Phone,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_customer"
  | "resolved"
  | "closed";

type TicketPriority = "low" | "medium" | "high" | "critical";

type Ticket = {
  id: string;
  subject: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  assigned_agent_id: string | null;
  created_at: string;
  updated_at: string;
  incident_type_selected: string | null;
  resolution_incident_type: string | null;
  agent_alias: string;
};

type Msg = {
  id: string;
  body: string;
  sender_role: "customer" | "agent" | "admin";
  created_at: string;
  created_at_ms?: number;
};

type BillingState = {
  isPaid: boolean;
  paymentRequired: boolean;
  quoteRequired: boolean;
  latestPaymentStatus: string | null;
  incidentTypeSelected: string | null;
  resolutionIncidentType: string | null;
  coveredByPlan: boolean;
  coveredPlanCode: string | null;
};

type CallReq = {
  id: string;
  type: "voice" | "video";
  status: "pending" | "accepted" | "rejected" | "canceled" | "ended";
  updatedAt: string;
};

const statusVariant: Record<
  TicketStatus,
  "default" | "destructive" | "secondary" | "outline"
> = {
  open: "destructive",
  in_progress: "default",
  waiting_customer: "outline",
  resolved: "secondary",
  closed: "secondary",
};

const priorityVariant: Record<
  TicketPriority,
  "default" | "destructive" | "secondary" | "outline"
> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
  critical: "destructive",
};

function shortId(id: string) {
  return id?.slice(0, 8) ?? id;
}

function formatTs(value: string, ms?: number) {
  const date = typeof ms === "number" ? new Date(ms) : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function formatIncident(code: string | null) {
  return code ? code.replaceAll("_", " ") : "Not selected";
}

export default function TicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [callReq, setCallReq] = useState<CallReq | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  const paymentLabel = useMemo(() => {
    if (!billing)
      return { text: "Loading billing", variant: "outline" as const };
    if (billing.billingOverrideState === "cleared") {
      return {
        text: "Billing cleared by admin",
        variant: "secondary" as const,
      };
    }
    if (billing.billingOverrideState === "blocked") {
      return {
        text: "Billing blocked by admin",
        variant: "destructive" as const,
      };
    }
    if (billing.coveredByPlan) {
      return {
        text: "Included in company plan",
        variant: "secondary" as const,
      };
    }
    if (billing.isPaid) return { text: "Paid", variant: "secondary" as const };
    if (billing.quoteRequired) {
      return { text: "Quote pending", variant: "destructive" as const };
    }
    if (billing.latestPaymentStatus) {
      return {
        text: billing.latestPaymentStatus.replaceAll("_", " "),
        variant: "outline" as const,
      };
    }
    if (billing.paymentRequired) {
      return { text: "Payment required", variant: "destructive" as const };
    }
    return { text: "Billing ready", variant: "outline" as const };
  }, [billing]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [ticketRes, messagesRes, billingRes, callRes] = await Promise.all(
          [
            fetch(`/api/tickets/${params.id}`, { cache: "no-store" }),
            fetch(`/api/tickets/${params.id}/messages`, { cache: "no-store" }),
            fetch(`/api/tickets/${params.id}/billing`, { cache: "no-store" }),
            fetch(`/api/tickets/${params.id}/call-request`, {
              cache: "no-store",
            }),
          ],
        );

        const [ticketJson, messagesJson, billingJson, callJson] =
          await Promise.all([
            ticketRes.json(),
            messagesRes.json(),
            billingRes.json(),
            callRes.json(),
          ]);

        if (!ticketRes.ok) {
          throw new Error(ticketJson?.error || "Failed to load ticket");
        }

        if (!cancelled) {
          setTicket(ticketJson.ticket);
          setMessages(messagesJson.messages || []);
          if (billingRes.ok) setBilling(billingJson.state || null);
          if (callRes.ok) setCallReq(callJson.callRequest || null);
        }
      } catch (e: any) {
        toast.error(e?.message || "Failed to load ticket");
        if (!cancelled) router.push("/tickets");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  const closeTicket = async () => {
    if (!ticket) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to close ticket");
      toast.success("Ticket closed");
      setTicket({ ...ticket, status: "closed" });
    } catch (e: any) {
      toast.error(e?.message || "Failed to close ticket");
    } finally {
      setClosing(false);
    }
  };

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <Link href="/tickets">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to tickets
            </Button>
          </Link>

          {loading || !ticket ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Loading ticket summary…
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="space-y-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariant[ticket.status]}>
                          {ticket.status.replaceAll("_", " ")}
                        </Badge>
                        <Badge variant={priorityVariant[ticket.priority]}>
                          {ticket.priority}
                        </Badge>
                        <Badge variant={paymentLabel.variant}>
                          {paymentLabel.text}
                        </Badge>
                      </div>
                      <div>
                        <CardTitle className="text-2xl">
                          {ticket.subject}
                        </CardTitle>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="font-mono">
                            #{shortId(ticket.id)}
                          </span>
                          <span>{ticket.category || "General"}</span>
                          <span>
                            Incident:{" "}
                            {formatIncident(ticket.incident_type_selected)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Link href={`/support?ticketId=${ticket.id}`}>
                        <Button>
                          Continue support
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        disabled={closing || ticket.status === "closed"}
                        onClick={closeTicket}
                      >
                        {ticket.status === "closed"
                          ? "Closed"
                          : closing
                            ? "Closing…"
                            : "Close ticket"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="grid gap-6 lg:grid-cols-3">
                  <div className="space-y-4 lg:col-span-2">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Description
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm">
                        {ticket.description || "No description provided yet."}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border p-4">
                        <div className="text-sm font-medium">
                          Current billing state
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {billing?.paymentRequired
                            ? "Complete payment in the support workspace before requesting voice or video."
                            : billing?.isPaid
                              ? "This ticket is already unlocked for live escalation."
                              : "Billing is attached to the active support session."}
                        </div>
                      </div>

                      <div className="rounded-xl border p-4">
                        <div className="text-sm font-medium">
                          Latest call state
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {callReq
                            ? `${callReq.type} request • ${callReq.status}`
                            : "No voice or video request yet."}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl border p-4">
                      <div className="text-sm font-medium text-muted-foreground">
                        Timeline
                      </div>
                      <div className="mt-3 space-y-3 text-sm">
                        <div className="flex gap-3">
                          <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">Created</div>
                            <div className="text-muted-foreground">
                              {new Date(ticket.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">Last updated</div>
                            <div className="text-muted-foreground">
                              {new Date(ticket.updated_at).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <CreditCard className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">Payment</div>
                            <div className="text-muted-foreground">
                              {paymentLabel.text}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">Live escalation</div>
                            <div className="text-muted-foreground">
                              {callReq
                                ? `Updated ${new Date(callReq.updatedAt).toLocaleString()}`
                                : "Not requested"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Recent conversation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {messages.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                        No messages yet. Open the support workspace to start the
                        realtime conversation.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.slice(-6).map((message) => (
                          <div
                            key={message.id}
                            className="rounded-xl border p-4"
                          >
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="font-medium capitalize">
                                {message.sender_role}
                              </span>
                              <span className="text-muted-foreground">
                                {formatTs(
                                  message.created_at,
                                  message.created_at_ms,
                                )}
                              </span>
                            </div>
                            <Separator className="my-3" />
                            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                              {message.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <AlertCircle className="h-5 w-5" />
                      Next best action
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-muted-foreground">
                    {billing?.coveredByPlan ? (
                      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                        This ticket is included in the active company plan. No
                        separate payment or admin quote is required for any
                        incident type.
                      </div>
                    ) : billing?.quoteRequired ? (
                      <div className="rounded-lg border p-4">
                        This incident is waiting for technician review before
                        pricing is confirmed.
                      </div>
                    ) : billing?.paymentRequired ? (
                      <div className="rounded-lg border p-4">
                        Payment is still blocking voice/video support for this
                        ticket.
                      </div>
                    ) : null}

                    {!ticket.incident_type_selected ? (
                      <div className="rounded-lg border p-4">
                        Choose the incident type inside the support workspace so
                        the final support price stays correct.
                      </div>
                    ) : null}

                    <Link href={`/support?ticketId=${ticket.id}`}>
                      <Button className="w-full">Open support workspace</Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
