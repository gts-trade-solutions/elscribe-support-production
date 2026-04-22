"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "../../app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Clock,
  MessageSquare,
  RefreshCw,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { CreateMagicLinkDialog } from "@/components/agent/create-magic-link-dialog";

type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_customer"
  | "resolved"
  | "closed";
type TicketPriority = "low" | "medium" | "high" | "critical";

type AgentTicketItem = {
  id: string;
  status: TicketStatus;
  priority: TicketPriority;
  subject: string;
  updatedAt: string;
  agentAlias: string;
  paymentRequired: boolean;
  quoteRequired: boolean;
  quoteAvailable: boolean;
  quoteAmount: number | null;
  quoteCurrency: string | null;
  latestPaymentStatus: string | null;
  incidentTypeSelected: string | null;
  coveredByPlan: boolean;
  coveredPlanCode: string | null;
  awaitingResponse: boolean;
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

function formatIncident(code: string | null) {
  return code ? code.replaceAll("_", " ") : "Not selected";
}

export default function AgentQueueClient({
  initialView,
}: {
  initialView: "mine" | "queue";
}) {
  const [mine, setMine] = useState<AgentTicketItem[]>([]);
  const [queue, setQueue] = useState<AgentTicketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<string>(initialView);

  const load = async () => {
    setLoading(true);
    try {
      const [mineRes, queueRes] = await Promise.all([
        fetch("/api/agent/tickets/mine", { cache: "no-store" }),
        fetch("/api/agent/tickets/queue", { cache: "no-store" }),
      ]);
      const mineJson = await mineRes.json();
      const queueJson = await queueRes.json();
      if (!mineRes.ok)
        throw new Error(mineJson?.error || "Failed to load my tickets");
      if (!queueRes.ok)
        throw new Error(queueJson?.error || "Failed to load queue");
      setMine(mineJson.tickets || []);
      setQueue(queueJson.tickets || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setTab(initialView);
  }, [initialView]);

  const stats = useMemo(
    () => ({
      mine: mine.length,
      queue: queue.length,
      paymentBlocked: [...mine, ...queue].filter(
        (ticket) =>
          ticket.paymentRequired ||
          ticket.quoteRequired ||
          !ticket.incidentTypeSelected,
      ).length,
    }),
    [mine, queue],
  );

  const claim = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/agent/tickets/${ticketId}/claim`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(
          json?.message || json?.error || "Failed to claim ticket",
        );
      toast.success("Ticket claimed");
      setTab("mine");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to claim ticket");
    }
  };

  const TicketCard = ({
    t,
    showClaim,
  }: {
    t: AgentTicketItem;
    showClaim?: boolean;
  }) => (
    <Card
      className={`overflow-hidden border-border/70 ${
        t.awaitingResponse
          ? "bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-200 dark:ring-amber-900/60"
          : ""
      }`}
    >
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={priorityVariant[t.priority]}>{t.priority}</Badge>
              <Badge variant={t.status === "open" ? "destructive" : "default"}>
                {t.status.replaceAll("_", " ")}
              </Badge>
              {t.awaitingResponse ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="destructive"
                        className="flex items-center gap-1"
                      >
                        <AlertCircle className="h-3 w-3" />
                        Awaiting response
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      Payment received. Customer is waiting for your first
                      response.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
              {!t.incidentTypeSelected ? (
                <Badge variant="destructive">Incident required</Badge>
              ) : t.coveredByPlan ? (
                <Badge variant="secondary">Included in plan</Badge>
              ) : t.quoteRequired ? (
                <Badge variant="destructive">Quote pending</Badge>
              ) : t.paymentRequired && t.quoteAvailable ? (
                <Badge variant="destructive">Quoted payment required</Badge>
              ) : t.paymentRequired ? (
                <Badge variant="destructive">Payment required</Badge>
              ) : (
                <Badge variant="secondary">Billing ready</Badge>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t.subject}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="font-mono">#{shortId(t.id)}</span>
                <span>{t.agentAlias}</span>
                <span>Incident: {formatIncident(t.incidentTypeSelected)}</span>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground lg:text-right">
            <div className="flex items-center gap-1 lg:justify-end">
              <Clock className="h-3 w-3" />
              <span>Updated {new Date(t.updatedAt).toLocaleString()}</span>
            </div>
            <div className="mt-1 flex items-center gap-1 lg:justify-end">
              <CreditCard className="h-3 w-3" />
              <span>
                {t.latestPaymentStatus ||
                  (!t.incidentTypeSelected
                    ? "incident required"
                    : t.coveredByPlan
                      ? "included in plan"
                      : t.quoteRequired
                        ? "quote pending"
                        : t.paymentRequired && t.quoteAvailable
                          ? `quoted ${t.quoteCurrency || ""}`.trim()
                          : t.paymentRequired
                            ? "unpaid"
                            : "ready")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            {!t.incidentTypeSelected
              ? "The customer must select an incident type before this case can move into the live workflow."
              : t.coveredByPlan
                ? "This case is covered by the active company plan and can move into live support once an agent claims it."
                : t.quoteRequired
                  ? "This case is waiting for an admin quote before it can move into the live workflow."
                  : t.paymentRequired && t.quoteAvailable
                    ? `A quote has been issued${t.quoteAmount ? ` for ${t.quoteCurrency || "" || ""} ${(t.quoteAmount / 100).toFixed(2)}` : ""}, and the customer still needs to pay it before live escalation.`
                    : t.paymentRequired
                      ? "Customer must pay before this case can move into live escalation."
                      : "This case is ready for agent action and live support."}
          </div>

          <div className="flex flex-wrap gap-3">
            {showClaim ? (
              <Button
                size="sm"
                onClick={() => claim(t.id)}
                disabled={
                  loading ||
                  !t.incidentTypeSelected ||
                  t.paymentRequired ||
                  t.quoteRequired
                }
                title={
                  !t.incidentTypeSelected
                    ? "The customer must select an incident type before you can claim"
                    : t.coveredByPlan
                      ? undefined
                      : t.quoteRequired
                        ? "This incident is waiting for an admin quote before it can be claimed"
                        : t.paymentRequired
                          ? "Customer must complete payment before you can claim"
                          : undefined
                }
              >
                Claim ticket
              </Button>
            ) : null}
            <Link href={`/agent/console?ticketId=${t.id}`}>
              <Button size="sm" variant="outline">
                Open workspace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Agent queue</h1>
              <p className="mt-2 text-muted-foreground">
                Claim new work, monitor your active tickets, and see which cases
                are still blocked by billing or quote review.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CreateMagicLinkDialog />
              <Button variant="outline" onClick={load} disabled={loading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground">My tickets</div>
                <div className="mt-1 text-3xl font-semibold">{stats.mine}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground">
                  Unassigned queue
                </div>
                <div className="mt-1 text-3xl font-semibold">{stats.queue}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground">
                  Billing blocked
                </div>
                <div className="mt-1 text-3xl font-semibold">
                  {stats.paymentBlocked}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="space-y-6">
            <TabsList>
              <TabsTrigger value="mine">My tickets ({mine.length})</TabsTrigger>
              <TabsTrigger value="queue">
                Unassigned ({queue.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mine">
              <div className="space-y-4">
                {mine.length === 0 ? (
                  <Card>
                    <CardContent className="space-y-4 py-12 text-center text-muted-foreground">
                      <p>You do not have any assigned tickets right now.</p>
                      <Button variant="outline" onClick={() => setTab("queue")}>
                        Review unassigned queue
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  mine.map((t) => <TicketCard key={t.id} t={t} />)
                )}
              </div>
            </TabsContent>

            <TabsContent value="queue">
              <div className="space-y-4">
                {queue.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No unassigned tickets are waiting in the queue.
                    </CardContent>
                  </Card>
                ) : (
                  queue.map((t) => <TicketCard key={t.id} t={t} showClaim />)
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
