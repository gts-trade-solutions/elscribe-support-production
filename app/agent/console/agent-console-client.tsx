"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { AppLayout } from "../../app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useSocket } from "@/hooks/use-socket";
import CallPanel from "@/components/livekit/call-panel";
import { Button } from "@/components/ui/button";
import {
  AgentTicket,
  CallReq,
  Msg,
  TicketStatus,
  TicketPriority,
  safePriority,
  safeStatus,
} from "@/components/agent/agent-console-types";
import { AgentChatCard } from "@/components/agent/agent-chat-card";
import { AgentResolutionCard } from "@/components/agent/agent-resolution-card";
import { PendingCallCard } from "@/components/agent/pending-call-card";
import {
  CreditCard,
  Headphones,
  LayoutPanelTop,
  MessageSquare,
} from "lucide-react";
import { isQuotedIncidentCode } from "@/lib/billing/pricing";

type BillingState = {
  isPaid: boolean;
  paymentRequired: boolean;
  quoteRequired: boolean;
  quoteAvailable: boolean;
  quoteAmount: number | null;
  quoteCurrency: string | null;
  quoteNote: string | null;
  quoteUpdatedAt: string | null;
  latestPaymentStatus: string | null;
  incidentTypeSelected: string | null;
  resolutionIncidentType: string | null;
  coveredByPlan: boolean;
  coveredPlanCode: string | null;
};

function shortId(id: string) {
  return id?.slice(0, 8) ?? id;
}

function formatIncident(code?: string | null) {
  return code ? code.replaceAll("_", " ") : "Not selected";
}

export default function AgentConsoleClient({
  ticketId,
}: {
  ticketId: string | null;
}) {
  const [ticket, setTicket] = useState<AgentTicket | null>(null);
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [acceptingCall, setAcceptingCall] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [status, setStatus] = useState<TicketStatus>("open");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [callReq, setCallReq] = useState<CallReq | null>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [quoteSaving, setQuoteSaving] = useState(false);

  const { data: session } = useSession();
  const { socket, connected: socketConnected } = useSocket();
  const [joined, setJoined] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const lastCallStatusRef = useRef<CallReq["status"] | null>(null);
  const canRender = useMemo(() => !!ticketId, [ticketId]);

  const loadTicket = async () => {
    if (!ticketId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError(null);

    try {
      const res = await fetch(`/api/agent/tickets/${ticketId}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load ticket");

      setTicket(json.ticket);
      setStatus(safeStatus(json.ticket?.status));
      setPriority(safePriority(json.ticket?.priority));
    } catch (e: any) {
      setPageError(e?.message || "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  };

  const loadCallRequest = async () => {
    if (!ticketId) return;

    try {
      const res = await fetch(`/api/tickets/${ticketId}/call-request`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Failed to load call request");
      }
      setCallReq((json.callRequest as CallReq) ?? null);
    } catch {
      setCallReq(null);
    }
  };

  const loadMessages = async () => {
    if (!ticketId) return;

    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load messages");
      setMessages(json.messages ?? []);
    } catch {
      setMessages([]);
    }
  };

  const loadBilling = async () => {
    if (!ticketId) return;

    try {
      const res = await fetch(`/api/tickets/${ticketId}/billing`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load billing");
      setBilling(json.state ?? null);
      if (json.state?.quoteAmount) {
        setQuoteAmount((Number(json.state.quoteAmount) / 100).toFixed(2));
      } else {
        setQuoteAmount("");
      }
      setQuoteNote(json.state?.quoteNote || "");
    } catch {
      setBilling(null);
      setQuoteAmount("");
      setQuoteNote("");
    }
  };

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  useEffect(() => {
    loadCallRequest();
  }, [ticketId]);

  useEffect(() => {
    loadMessages();
  }, [ticketId]);

  useEffect(() => {
    loadBilling();
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;
    if (socketConnected && joined) return;

    const t = setInterval(() => {
      loadCallRequest();
      loadBilling();
    }, 5000);

    return () => clearInterval(t);
  }, [ticketId, socketConnected, joined]);

  useEffect(() => {
    if (!ticketId) return;

    let cancelled = false;

    const doJoin = () => {
      socket.emit("ticket:join", { ticketId }, (ack: any) => {
        if (cancelled) return;
        setJoined(Boolean(ack?.ok));
      });
    };

    const onNewMessage = (payload: any) => {
      const msg = payload?.message as Msg | undefined;
      if (!msg?.id) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const onCallUpdate = (payload: any) => {
      const latest = payload?.callRequest as CallReq | undefined;
      if (!latest?.id) return;
      setCallReq(latest);
    };

    socket.on("message:new", onNewMessage);
    socket.on("call_request:update", onCallUpdate);
    socket.on("connect", doJoin);

    if (socketConnected) doJoin();

    const joinRetry = setInterval(() => {
      if (!socket.connected) return;
      if (joined) return;
      doJoin();
    }, 2000);

    return () => {
      cancelled = true;
      socket.off("message:new", onNewMessage);
      socket.off("call_request:update", onCallUpdate);
      socket.off("connect", doJoin);
      clearInterval(joinRetry);
    };
  }, [socket, socketConnected, ticketId, joined]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, callReq?.status]);

  const sendMessage = async () => {
    const body = messageBody.trim();
    if (!ticketId || !body || sendingMessage) return;

    setSendingMessage(true);
    try {
      if (socketConnected && joined) {
        const ack = await new Promise<any>((resolve) => {
          socket.emit("message:send", { ticketId, body }, resolve);
        });

        if (ack?.ok && ack?.message) {
          const msg = ack.message as Msg;
          setMessageBody("");
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          return;
        }
      }

      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json?.error || "Failed to send message");

      setMessageBody("");
      setMessages((prev) => {
        const msg = json.message as Msg | undefined;
        if (msg?.id && prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    } catch (e: any) {
      toast.error(e?.message || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const acceptCall = async () => {
    if (!ticketId || !callReq || acceptingCall) return;

    setAcceptingCall(true);
    try {
      const res = await fetch(
        `/api/tickets/${ticketId}/call-request/${callReq.id}/accept`,
        { method: "POST" },
      );
      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json?.message || json?.error || "Failed to accept call request",
        );
      }

      toast.success("Call request accepted");
      setCallReq(json.callRequest);
      await loadBilling();
    } catch (e: any) {
      toast.error(e?.message || "Failed to accept call request");
    } finally {
      setAcceptingCall(false);
    }
  };

  const saveControls = async () => {
    if (!ticket) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, priority }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json?.error || "Failed to update ticket");

      const updatedAt = new Date().toISOString();
      toast.success("Ticket controls updated");
      setTicket({ ...ticket, status, priority, updated_at: updatedAt });
    } catch (e: any) {
      toast.error(e?.message || "Failed to update ticket");
    } finally {
      setSaving(false);
    }
  };

  const saveQuote = async () => {
    if (!ticketId) return;
    const amount = Number(quoteAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid quote amount");
      return;
    }

    setQuoteSaving(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, note: quoteNote || null }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.message || json?.error || "Failed to save quote");
      toast.success("Quote saved");
      await loadBilling();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save quote");
    } finally {
      setQuoteSaving(false);
    }
  };

  useEffect(() => {
    const prev = lastCallStatusRef.current;
    const next = callReq?.status ?? null;
    lastCallStatusRef.current = next;
    if (!prev || prev === next || !next) return;

    if (next === "accepted") {
      toast.success("Call request accepted. Connecting automatically…");
    } else if (next === "ended") {
      toast.info("Call ended.");
    } else if (next === "rejected") {
      toast.error("Call request rejected.");
    } else if (next === "canceled") {
      toast.info("Call request canceled.");
    }
  }, [callReq?.status]);

  const callActive = Boolean(callReq?.status === "accepted" && ticketId);

  const paymentBadge =
    billing?.billingOverrideState === "cleared"
      ? { label: "Billing cleared by admin", variant: "secondary" as const }
      : billing?.billingOverrideState === "blocked"
        ? { label: "Billing blocked by admin", variant: "destructive" as const }
        : billing?.coveredByPlan
          ? { label: "Included in company plan", variant: "secondary" as const }
          : billing?.isPaid
            ? { label: "Paid", variant: "secondary" as const }
            : billing?.quoteRequired
              ? { label: "Quote pending", variant: "destructive" as const }
              : billing?.paymentRequired
                ? {
                    label: billing?.quoteAvailable
                      ? "Quoted payment required"
                      : "Payment required",
                    variant: "destructive" as const,
                  }
                : billing?.latestPaymentStatus
                  ? {
                      label: billing.latestPaymentStatus.replaceAll("_", " "),
                      variant: "outline" as const,
                    }
                  : { label: "Billing ready", variant: "outline" as const };

  const isAdmin = session?.user?.role === "admin";
  const canQuote =
    isAdmin &&
    isQuotedIncidentCode(billing?.incidentTypeSelected) &&
    !billing?.isPaid &&
    !billing?.coveredByPlan &&
    billing?.billingOverrideState !== "cleared";
  const quoteCard = canQuote ? (
    <Card>
      <CardContent className="space-y-3 p-4 text-sm">
        <div className="font-medium text-foreground">Admin quote</div>
        <div className="text-muted-foreground">
          Issue or revise the quote for this incident. Customers can pay only
          after this amount is saved.
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Amount ({billing?.quoteCurrency || "USD"})
          </label>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={quoteAmount}
            onChange={(e) => setQuoteAmount(e.target.value)}
            placeholder="Enter quote amount"
            type="number"
            min="0"
            step="0.01"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Note
          </label>
          <textarea
            className="min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={quoteNote}
            onChange={(e) => setQuoteNote(e.target.value)}
            placeholder="Add quote details or scope notes"
          />
        </div>
        {billing?.billingOverrideState === "cleared" ? (
          <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
            Billing was cleared by admin, so quote issuance is no longer
            required for this ticket.
          </div>
        ) : billing?.quoteAvailable ? (
          <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
            Current quote: {billing.quoteCurrency || "USD"}{" "}
            {((billing.quoteAmount || 0) / 100).toFixed(2)}
            {billing.quoteUpdatedAt
              ? ` • updated ${new Date(billing.quoteUpdatedAt).toLocaleString()}`
              : ""}
          </div>
        ) : billing?.quoteRequired ? (
          <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
            No quote has been issued yet. This ticket is still blocked until an
            admin saves one.
          </div>
        ) : null}
        <Button onClick={saveQuote} disabled={quoteSaving} className="w-full">
          {quoteSaving
            ? "Saving quote…"
            : billing?.quoteAvailable
              ? "Update quote"
              : "Issue quote"}
        </Button>
      </CardContent>
    </Card>
  ) : null;

  return (
    <AppLayout>
      <div className="container flex h-[calc(100dvh-4rem)] flex-col py-4 sm:py-5">
        <div className="mb-3 flex shrink-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <LayoutPanelTop className="h-3 w-3" />
                Agent workspace
              </Badge>

              {ticket ? (
                <>
                  <Badge variant="outline">Ticket #{shortId(ticket.id)}</Badge>
                  <Badge variant={paymentBadge.variant}>
                    {paymentBadge.label}
                  </Badge>
                </>
              ) : null}
            </div>

            <h1 className="text-2xl font-bold">Agent workspace</h1>
            <div className="mt-1 text-sm text-muted-foreground">
              Handle the active ticket, live escalation, and resolution from one
              place.
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/agent/queue?view=mine">My tickets</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/agent/queue?view=queue">Queue</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/agent/settings">Agent settings</Link>
            </Button>
          </div>
        </div>

        {!canRender ? (
          <div className="min-h-0 flex-1">
            <Card className="flex h-full min-h-0 flex-col">
              <CardContent className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center text-muted-foreground">
                <p>Open a ticket from the queue to start working the case.</p>
                <Button asChild>
                  <Link href="/agent/queue?view=queue">Go to queue</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : loading ? (
          <div className="min-h-0 flex-1">
            <Card className="flex h-full min-h-0 flex-col">
              <CardContent className="flex flex-1 items-center justify-center py-12 text-center text-muted-foreground">
                Loading ticket workspace…
              </CardContent>
            </Card>
          </div>
        ) : pageError ? (
          <div className="min-h-0 flex-1">
            <Card className="flex h-full min-h-0 flex-col">
              <CardContent className="space-y-4 py-8">
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  {pageError}
                </div>
                <div className="flex gap-3">
                  <Button onClick={loadTicket}>Try again</Button>
                  <Button asChild variant="outline">
                    <Link href="/agent/queue?view=queue">Back to queue</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : !ticket ? (
          <div className="min-h-0 flex-1">
            <Card className="flex h-full min-h-0 flex-col">
              <CardContent className="flex flex-1 items-center justify-center py-12 text-center text-muted-foreground">
                Ticket workspace could not be prepared.
              </CardContent>
            </Card>
          </div>
        ) : callActive && ticketId && callReq ? (
          <div className="min-h-0 flex-1">
            <div className="grid h-full min-h-0 grid-cols-1 gap-5 lg:grid-cols-12">
              <div className="min-h-0 lg:col-span-7">
                <CallPanel
                  ticketId={ticketId}
                  callRequestId={callReq.id}
                  callTypeHint={callReq.type}
                  onNotice={(message) => {
                    if (!message) return;
                    if (message.toLowerCase().includes("reconnect")) {
                      toast.info(message);
                      return;
                    }
                    if (message.toLowerCase().includes("ended")) {
                      toast.info(message);
                      return;
                    }
                    toast.success(message);
                  }}
                />
              </div>

              <div className="min-h-0 lg:col-span-5">
                <Tabs
                  defaultValue="chat"
                  className="flex h-full min-h-0 flex-col"
                >
                  <TabsList className="mb-2 h-9 w-full justify-start rounded-lg p-1">
                    <TabsTrigger value="chat" className="flex-1 text-sm">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Chat
                    </TabsTrigger>
                    <TabsTrigger value="controls" className="flex-1 text-sm">
                      <Headphones className="mr-2 h-4 w-4" />
                      Controls
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="chat"
                    className="mt-0 flex h-full flex-col"
                  >
                    <AgentChatCard
                      ticket={ticket}
                      messages={messages}
                      messageBody={messageBody}
                      onMessageBodyChange={setMessageBody}
                      onSendMessage={sendMessage}
                      socketConnected={socketConnected}
                      joined={joined}
                      sendingMessage={sendingMessage}
                      chatScrollRef={chatScrollRef}
                      billingLabel={paymentBadge.label}
                      incidentLabel={formatIncident(
                        billing?.incidentTypeSelected,
                      )}
                      compact
                    />
                  </TabsContent>

                  <TabsContent value="controls" className="mt-0 flex  flex-col">
                    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
                      {callReq ? (
                        <PendingCallCard
                          callReq={callReq}
                          onAccept={acceptCall}
                          accepting={acceptingCall}
                          compact
                        />
                      ) : null}
                      <AgentResolutionCard
                        status={status}
                        priority={priority}
                        onStatusChange={setStatus}
                        onPriorityChange={setPriority}
                        onSave={saveControls}
                        saving={saving}
                        currentStatus={ticket.status}
                        currentPriority={ticket.priority}
                        compact
                      />
                      {quoteCard}
                      <Card>
                        <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            <CreditCard className="h-4 w-4" />
                            Billing state
                          </div>
                          <div>
                            {billing?.coveredByPlan
                              ? "This ticket is covered by the active company plan. No per-incident billing or quote is required."
                              : billing?.quoteRequired
                                ? "This incident is waiting for an admin quote before the ticket can move into live support."
                                : billing?.paymentRequired
                                  ? billing?.quoteAvailable
                                    ? "A quote has been issued, but the customer still needs to pay it before the ticket can move into live support."
                                    : "Customer payment is still required before the ticket can move into live support."
                                  : "Billing is clear for live support handling."}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1">
            <div className="grid h-full min-h-0 grid-cols-1 gap-5 lg:grid-cols-12">
              <div className="min-h-0 lg:col-span-8">
                <AgentChatCard
                  ticket={ticket}
                  messages={messages}
                  messageBody={messageBody}
                  onMessageBodyChange={setMessageBody}
                  onSendMessage={sendMessage}
                  socketConnected={socketConnected}
                  joined={joined}
                  sendingMessage={sendingMessage}
                  chatScrollRef={chatScrollRef}
                  billingLabel={paymentBadge.label}
                  incidentLabel={formatIncident(billing?.incidentTypeSelected)}
                />
              </div>

              <div className="min-h-0 lg:col-span-4">
                <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-1">
                  {callReq ? (
                    <PendingCallCard
                      callReq={callReq}
                      onAccept={acceptCall}
                      accepting={acceptingCall}
                    />
                  ) : null}
                  <AgentResolutionCard
                    status={status}
                    priority={priority}
                    onStatusChange={setStatus}
                    onPriorityChange={setPriority}
                    onSave={saveControls}
                    saving={saving}
                    currentStatus={ticket.status}
                    currentPriority={ticket.priority}
                  />
                  {quoteCard}
                  <Card>
                    <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
                      <div className="font-medium text-foreground">
                        Billing state
                      </div>
                      <div>{paymentBadge.label}</div>
                      {billing?.coveredByPlan ? (
                        <div>Covered by active company plan</div>
                      ) : billing?.quoteAvailable ? (
                        <div>
                          Quote: {billing.quoteCurrency || "USD"}{" "}
                          {((billing.quoteAmount || 0) / 100).toFixed(2)}
                        </div>
                      ) : null}
                      <div>
                        Incident:{" "}
                        {formatIncident(billing?.incidentTypeSelected)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
