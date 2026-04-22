"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "../app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CallPanel from "@/components/livekit/call-panel";
import {
  BillingState,
  CallReq,
  IncidentItem,
  Msg,
  Ticket,
  isLikelyTicketId,
  safeJson,
} from "@/components/support/support-types";
import { SupportChatPane } from "@/components/support/support-chat-pane";
import { SupportActionsPane } from "@/components/support/support-actions-pane";
import { useSocket } from "@/hooks/use-socket";
import { Headphones, MessageSquare, Ticket as TicketIcon } from "lucide-react";

function shortId(id: string) {
  return id?.slice(0, 8) ?? id;
}

function formatIncident(code?: string | null) {
  return code ? code.replaceAll("_", " ") : "Not selected";
}

export default function SupportClient({ ticketId }: { ticketId: string }) {
  const tid = useMemo(() => {
    const t = String(ticketId || "").trim();
    if (!t || !isLikelyTicketId(t)) return null;
    return t;
  }, [ticketId]);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [callReq, setCallReq] = useState<CallReq | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [billing, setBilling] = useState<BillingState | null>(null);
  const [incidentCatalog, setIncidentCatalog] = useState<IncidentItem[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [processorCurrency, setProcessorCurrency] = useState("INR");
  const [savingIncident, setSavingIncident] = useState(false);
  const [paying, setPaying] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [requestingCallType, setRequestingCallType] = useState<
    "voice" | "video" | null
  >(null);

  const { socket, connected: socketConnected, lastError } = useSocket();
  const [joined, setJoined] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const lastCallStatusRef = useRef<CallReq["status"] | null>(null);

  const scrollToBottom = () => {
    const root = scrollAreaRef.current;
    if (!root) return;
    const viewport = root.querySelector(
      "div[data-radix-scroll-area-viewport]",
    ) as HTMLDivElement | null;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  };

  const refresh = async (background = false) => {
    if (!tid) {
      setError("Missing or invalid ticketId in URL.");
      setIsLoading(false);
      return;
    }

    if (background) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const tRes = await fetch(`/api/tickets/${tid}`, { cache: "no-store" });
      const tData = await safeJson(tRes);
      if (!tRes.ok) throw new Error(tData?.message ?? "Failed to load ticket");
      setTicket(tData.ticket);

      const mRes = await fetch(`/api/tickets/${tid}/messages`, {
        cache: "no-store",
      });
      const mData = await safeJson(mRes);
      if (!mRes.ok) {
        throw new Error(mData?.message ?? "Failed to load messages");
      }
      setMessages(mData.messages ?? []);

      const cRes = await fetch(`/api/tickets/${tid}/call-request`, {
        cache: "no-store",
      });
      const cData = await safeJson(cRes);
      if (cRes.ok) setCallReq((cData.callRequest as CallReq) ?? null);

      const bRes = await fetch(`/api/tickets/${tid}/billing`, {
        cache: "no-store",
      });
      const bData = await safeJson(bRes);
      if (bRes.ok) {
        setBilling((bData.state as BillingState) ?? null);
        setIncidentCatalog((bData.incidentCatalog as IncidentItem[]) ?? []);
        setCurrency(String(bData.displayCurrency || bData.currency || "USD"));
        setProcessorCurrency(String(bData.processorCurrency || "INR"));
      }

      setTimeout(scrollToBottom, 0);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const loadRazorpay = async () => {
    if (typeof window === "undefined") return false;
    if (window.Razorpay) return true;

    return await new Promise<boolean>((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const saveIncidentType = async (code: string) => {
    if (!tid || ticket?.incident_type_selected || billing?.incidentTypeSelected)
      return;
    setSavingIncident(true);
    try {
      const res = await fetch(`/api/tickets/${tid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentTypeSelected: code || null }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data?.message ?? data?.error ?? "Failed to save");
      }
      setNotice("Incident type saved.");
      await refresh(true);
    } catch (e: any) {
      setNotice(e?.message ?? "Failed to save incident type");
    } finally {
      setSavingIncident(false);
    }
  };

  const payNow = async () => {
    if (!tid) return;

    const incidentCode =
      billing?.incidentTypeSelected || ticket?.incident_type_selected || "";

    if (!incidentCode) {
      setNotice("Please select an incident type first.");
      return;
    }

    if (billing?.coveredByPlan) {
      setNotice(
        "This ticket is covered by the active company plan. No per-incident payment is required.",
      );
      return;
    }

    const incidentItem = incidentCatalog.find(
      (item) => item.code === incidentCode,
    );
    if (incidentItem?.pricingModel === "quoted" && !billing?.quoteAvailable) {
      setNotice(
        "This incident is waiting for an admin quote before online payment becomes available.",
      );
      return;
    }

    setNotice(null);
    setPaying(true);

    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Failed to load Razorpay checkout");

      const res = await fetch(`/api/billing/incident/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: tid }),
      });
      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(
          data?.message ?? data?.error ?? "Failed to create order",
        );
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "El Scribe",
        description: `${
          data?.incident?.label || "Support"
        } • Ticket ${String(tid).slice(0, 8)}`,
        order_id: data.orderId,
        handler: async (resp: any) => {
          try {
            const vr = await fetch(`/api/billing/incident/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ticketId: tid,
                paymentId: data.paymentId,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_signature: resp.razorpay_signature,
              }),
            });
            const vj = await safeJson(vr);
            if (!vr.ok) {
              throw new Error(
                vj?.message ?? vj?.error ?? "Verification failed",
              );
            }
            setNotice(
              "Payment successful. Live support becomes available once an agent is assigned.",
            );
            await refresh(true);
          } catch (e: any) {
            setNotice(e?.message ?? "Payment verification failed");
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
          },
        },
        notes: {
          ticketId: tid,
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e: any) {
      setNotice(e?.message ?? "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [tid]);

  useEffect(() => {
    const prev = lastCallStatusRef.current;
    const next = callReq?.status ?? null;
    lastCallStatusRef.current = next;
    if (!prev || prev === next || !next) return;

    if (next === "accepted") {
      setNotice("Agent accepted the call. Connecting automatically…");
      setTimeout(() => setNotice(null), 2500);
    } else if (next === "rejected") {
      setNotice("Agent rejected the call request.");
    } else if (next === "ended") {
      setNotice(
        "Call ended. You can continue in chat or request another live session if needed.",
      );
    } else if (next === "canceled") {
      setNotice("Call request canceled.");
    }
  }, [callReq?.status]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  useEffect(() => {
    if (!tid) return;

    if (socketConnected && joined) return;

    const poll = setInterval(async () => {
      try {
        const cRes = await fetch(`/api/tickets/${tid}/call-request`, {
          cache: "no-store",
        });
        const cData = await safeJson(cRes);
        if (!cRes.ok) return;

        const latest = (cData.callRequest as CallReq) ?? null;
        setCallReq((prev) => {
          if (!latest) return null;
          if (!prev) return latest;
          if (prev.id !== latest.id) return latest;
          if (prev.status !== latest.status) return latest;
          return prev;
        });
      } catch {
        return;
      }
    }, 5000);

    return () => clearInterval(poll);
  }, [tid, socketConnected, joined]);

  useEffect(() => {
    if (!tid) return;

    let cancelled = false;

    const doJoin = () => {
      socket.emit("ticket:join", { ticketId: tid }, (ack: any) => {
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
      const latest =
        (payload?.callRequest as CallReq | null | undefined) ?? null;
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
  }, [socket, socketConnected, tid, joined]);

  const sendMessage = async () => {
    if (!tid) return;
    const body = messageBody.trim();
    if (!body || sendingMessage) return;

    setNotice(null);
    setSendingMessage(true);

    try {
      if (socketConnected) {
        const ack = await new Promise<any>((resolve) => {
          let done = false;
          const t = setTimeout(() => {
            if (done) return;
            done = true;
            resolve(null);
          }, 4500);

          socket.emit("message:send", { ticketId: tid, body }, (a: any) => {
            if (done) return;
            done = true;
            clearTimeout(t);
            resolve(a);
          });
        });

        if (ack?.ok) {
          const msg = ack?.message as Msg | undefined;
          setMessageBody("");
          if (msg?.id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
          return;
        }

        if (ack?.error) setNotice(String(ack.error));
      }

      const res = await fetch(`/api/tickets/${tid}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setNotice(data?.message ?? "Failed to send message");
        return;
      }

      setMessageBody("");
      setMessages((prev) => {
        const msg = data.message as Msg | undefined;
        if (msg?.id && prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const requestCall = async (type: "voice" | "video") => {
    if (!tid || requestingCallType) return;
    setNotice(null);
    setRequestingCallType(type);

    try {
      const res = await fetch(`/api/tickets/${tid}/call-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setNotice(data?.message ?? "Failed to request call");
        return;
      }

      const created = data.callRequest as CallReq | undefined;
      if (created?.id) setCallReq(created);

      setNotice(`Requested ${type}. Waiting for agent approval.`);
    } finally {
      setRequestingCallType(null);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container py-6">Loading support session…</div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="container py-6">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div className="font-semibold text-destructive">{error}</div>
            <div className="mt-4 flex gap-3">
              <Button onClick={() => refresh()}>Try again</Button>
              <Button asChild variant="outline">
                <Link href="/tickets">Back to tickets</Link>
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!ticket) {
    return (
      <AppLayout>
        <div className="container py-6">
          <div className="rounded-lg border p-4">
            <div className="font-semibold">Ticket not found.</div>
            <div className="mt-4">
              <Button asChild variant="outline">
                <Link href="/tickets">Back to tickets</Link>
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const callActive = Boolean(callReq?.status === "accepted" && tid);

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
                ? { label: "Payment required", variant: "destructive" as const }
                : billing?.latestPaymentStatus
                  ? {
                      label: billing.latestPaymentStatus.replaceAll("_", " "),
                      variant: "outline" as const,
                    }
                  : ticket.incident_type_selected
                    ? {
                        label: "Awaiting billing review",
                        variant: "outline" as const,
                      }
                    : { label: "Select incident", variant: "outline" as const };

  return (
    <AppLayout>
      <div className="container flex h-[calc(100dvh-4rem)] flex-col py-4 sm:py-5">
        <div className="mb-3 flex shrink-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <TicketIcon className="h-3 w-3" />
                Ticket #{shortId(ticket.id)}
              </Badge>
              <Badge
                variant={
                  ticket.status === "open"
                    ? "destructive"
                    : ticket.status === "resolved" || ticket.status === "closed"
                      ? "secondary"
                      : "default"
                }
              >
                {ticket.status.replaceAll("_", " ")}
              </Badge>
              <Badge variant={paymentBadge.variant}>{paymentBadge.label}</Badge>
            </div>

            <h1 className="text-2xl font-bold">Support workspace</h1>
            <div className="mt-1 text-sm text-muted-foreground">
              Manage the conversation, payment state, and live escalation from
              one place.
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/tickets">Back to tickets</Link>
            </Button>
          </div>
        </div>

        {notice ? (
          <div className="mb-3 shrink-0 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
            {notice}
          </div>
        ) : null}

        <div className="min-h-0 flex-1">
          <div className="grid h-full min-h-0 gap-5 lg:grid-cols-12">
            {callActive && tid && callReq ? (
              <>
                <div className="min-h-0 lg:col-span-7">
                  <CallPanel
                    ticketId={tid}
                    callRequestId={callReq.id}
                    callTypeHint={callReq.type}
                    onNotice={(message) => setNotice(message)}
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
                      <TabsTrigger value="actions" className="flex-1 text-sm">
                        <Headphones className="mr-2 h-4 w-4" />
                        Actions
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent
                      value="chat"
                      className="mt-0 flex min-h-0 h-full flex-col"
                    >
                      <SupportChatPane
                        ticket={ticket}
                        messages={messages}
                        messageBody={messageBody}
                        onMessageBodyChange={setMessageBody}
                        onSendMessage={sendMessage}
                        onRefresh={() => refresh(true)}
                        refreshing={refreshing}
                        sendingMessage={sendingMessage}
                        socketConnected={socketConnected}
                        joined={joined}
                        lastError={lastError}
                        scrollAreaRef={scrollAreaRef}
                        billingLabel={paymentBadge.label}
                        incidentLabel={formatIncident(
                          billing?.incidentTypeSelected ||
                            ticket.incident_type_selected,
                        )}
                        compact
                      />
                    </TabsContent>

                    <TabsContent value="actions" className="mt-0 flex flex-col">
                      <SupportActionsPane
                        ticket={ticket}
                        billing={billing}
                        incidentCatalog={incidentCatalog}
                        currency={currency}
                        savingIncident={savingIncident}
                        paying={paying}
                        requestingCallType={requestingCallType}
                        callReq={callReq}
                        onSaveIncidentType={saveIncidentType}
                        onPayNow={payNow}
                        onRequestCall={requestCall}
                        compact
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </>
            ) : (
              <>
                <div className="min-h-0 lg:col-span-8">
                  <SupportChatPane
                    ticket={ticket}
                    messages={messages}
                    messageBody={messageBody}
                    onMessageBodyChange={setMessageBody}
                    onSendMessage={sendMessage}
                    onRefresh={() => refresh(true)}
                    refreshing={refreshing}
                    sendingMessage={sendingMessage}
                    socketConnected={socketConnected}
                    joined={joined}
                    lastError={lastError}
                    scrollAreaRef={scrollAreaRef}
                    billingLabel={paymentBadge.label}
                    incidentLabel={formatIncident(
                      billing?.incidentTypeSelected ||
                        ticket.incident_type_selected,
                    )}
                  />
                </div>

                <div className="min-h-0 lg:col-span-4">
                  <SupportActionsPane
                    ticket={ticket}
                    billing={billing}
                    incidentCatalog={incidentCatalog}
                    currency={currency}
                    savingIncident={savingIncident}
                    paying={paying}
                    requestingCallType={requestingCallType}
                    callReq={callReq}
                    onSaveIncidentType={saveIncidentType}
                    onPayNow={payNow}
                    onRequestCall={requestCall}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
