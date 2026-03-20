"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "../app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  X,
  ArrowRight,
  CreditCard,
  Headphones,
  Receipt,
} from "lucide-react";

type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_customer"
  | "resolved"
  | "closed";

type TicketPriority = "low" | "medium" | "high" | "critical";

type TicketListItem = {
  id: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  subject: string;
  createdAt: string;
  updatedAt: string;
  assignedAgentId: string | null;
  incidentTypeSelected: string | null;
  latestPaymentStatus: string | null;
  paymentRequired: boolean;
  quoteRequired: boolean;
  isPaid: boolean;
  coveredByPlan: boolean;
  coveredPlanCode: string | null;
};

const statusConfig: Record<
  TicketStatus,
  {
    label: string;
    icon: typeof AlertCircle;
    variant: "default" | "destructive" | "secondary" | "outline";
  }
> = {
  open: { label: "Open", icon: AlertCircle, variant: "destructive" },
  in_progress: { label: "In progress", icon: Clock, variant: "default" },
  waiting_customer: {
    label: "Waiting for you",
    icon: Clock,
    variant: "outline",
  },
  resolved: { label: "Resolved", icon: CheckCircle2, variant: "secondary" },
  closed: { label: "Closed", icon: CheckCircle2, variant: "secondary" },
};

const priorityConfig: Record<
  TicketPriority,
  {
    label: string;
    variant: "default" | "destructive" | "secondary" | "outline";
  }
> = {
  low: { label: "Low", variant: "secondary" },
  medium: { label: "Medium", variant: "default" },
  high: { label: "High", variant: "destructive" },
  critical: { label: "Critical", variant: "destructive" },
};

const paymentCopy = (ticket: TicketListItem) => {
  if (ticket.coveredByPlan) {
    return { label: "Included in company plan", variant: "secondary" as const };
  }
  if (ticket.isPaid) return { label: "Paid", variant: "secondary" as const };
  if (ticket.quoteRequired) {
    return { label: "Quote pending", variant: "destructive" as const };
  }
  if (ticket.latestPaymentStatus) {
    return {
      label: ticket.latestPaymentStatus.replaceAll("_", " "),
      variant: "outline" as const,
    };
  }
  if (ticket.paymentRequired) {
    return { label: "Payment required", variant: "destructive" as const };
  }
  return { label: "Billing ready", variant: "outline" as const };
};

function shortId(id: string) {
  return id?.slice(0, 8) ?? id;
}

function formatIncident(code: string | null) {
  if (!code) return "Not selected";
  return code.replaceAll("_", " ");
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<TicketStatus[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/tickets", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load tickets");
        if (!cancelled) setTickets(json.tickets || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load tickets");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const q = searchQuery.trim().toLowerCase();
      if (
        q &&
        !t.subject.toLowerCase().includes(q) &&
        !t.id.toLowerCase().includes(q) &&
        !String(t.category || "")
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(t.status)) {
        return false;
      }
      return true;
    });
  }, [tickets, searchQuery, selectedStatuses]);

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      active: tickets.filter((t) =>
        ["open", "in_progress", "waiting_customer"].includes(t.status),
      ).length,
      paymentRequired: tickets.filter(
        (t) => t.paymentRequired || t.quoteRequired,
      ).length,
      assigned: tickets.filter((t) => Boolean(t.assignedAgentId)).length,
    };
  }, [tickets]);

  const toggleStatus = (status: TicketStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  const clearFilters = () => {
    setSelectedStatuses([]);
    setSearchQuery("");
  };

  const hasActiveFilters = selectedStatuses.length > 0 || searchQuery !== "";

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Your support tickets</h1>
              <p className="mt-2 text-muted-foreground">
                Track plan coverage, payment readiness, current ticket status,
                and the fastest way back into your support workspace.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/pricing">
                <Button variant="outline">Review pricing</Button>
              </Link>
              <Link href="/tickets/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New ticket
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Total tickets
                  </div>
                  <div className="mt-1 text-3xl font-semibold">
                    {stats.total}
                  </div>
                </div>
                <Receipt className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <div className="text-sm text-muted-foreground">Active</div>
                  <div className="mt-1 text-3xl font-semibold">
                    {stats.active}
                  </div>
                </div>
                <Headphones className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Billing blocked
                  </div>
                  <div className="mt-1 text-3xl font-semibold">
                    {stats.paymentRequired}
                  </div>
                </div>
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <div className="text-sm text-muted-foreground">Assigned</div>
                  <div className="mt-1 text-3xl font-semibold">
                    {stats.assigned}
                  </div>
                </div>
                <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ticket ID, subject, or category"
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    Status
                  </span>
                  {(
                    [
                      "open",
                      "in_progress",
                      "waiting_customer",
                      "resolved",
                    ] as TicketStatus[]
                  ).map((status) => (
                    <Button
                      key={status}
                      variant={
                        selectedStatuses.includes(status)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className="h-8"
                      onClick={() => toggleStatus(status)}
                    >
                      {statusConfig[status].label}
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>
                    {loading
                      ? "Loading tickets…"
                      : `${filteredTickets.length} shown of ${tickets.length}`}
                  </span>
                  {hasActiveFilters ? (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="mr-1 h-3 w-3" />
                      Clear
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {error ? (
            <Card>
              <CardContent className="py-4 text-sm text-destructive">
                {error}
              </CardContent>
            </Card>
          ) : null}

          <div className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Loading tickets…
                </CardContent>
              </Card>
            ) : filteredTickets.length === 0 ? (
              <Card>
                <CardContent className="space-y-4 py-12 text-center">
                  <p className="text-muted-foreground">
                    No tickets match your current filters.
                  </p>
                  <div className="flex justify-center gap-3">
                    {hasActiveFilters ? (
                      <Button variant="outline" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    ) : null}
                    <Link href="/tickets/new">
                      <Button>Create your first ticket</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredTickets.map((ticket) => {
                const StatusIcon = statusConfig[ticket.status].icon;
                const payment = paymentCopy(ticket);
                const continueHref = `/support?ticketId=${ticket.id}`;

                return (
                  <Card
                    key={ticket.id}
                    className="overflow-hidden border-border/70"
                  >
                    <CardContent className="space-y-4 p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant={statusConfig[ticket.status].variant}
                              className="gap-1"
                            >
                              <StatusIcon className="h-3 w-3" />
                              {statusConfig[ticket.status].label}
                            </Badge>
                            <Badge
                              variant={priorityConfig[ticket.priority].variant}
                            >
                              {priorityConfig[ticket.priority].label}
                            </Badge>
                            <Badge variant={payment.variant}>
                              {payment.label}
                            </Badge>
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold">
                              {ticket.subject}
                            </h3>
                            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="font-mono">
                                #{shortId(ticket.id)}
                              </span>
                              <span>
                                Incident:{" "}
                                {formatIncident(ticket.incidentTypeSelected)}
                              </span>
                              <span>{ticket.category || "General"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground lg:text-right">
                          <div>
                            Updated{" "}
                            {new Date(ticket.updatedAt).toLocaleString()}
                          </div>
                          <div className="mt-1">
                            {ticket.assignedAgentId
                              ? "Agent assigned"
                              : "Waiting for agent claim"}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 border-t pt-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="text-sm text-muted-foreground">
                          {ticket.quoteRequired
                            ? "This incident is waiting for technician review before pricing is confirmed."
                            : ticket.paymentRequired
                              ? "Complete payment in the support workspace to unlock voice/video support."
                              : ticket.isPaid
                                ? "This ticket is ready for live support escalation."
                                : "This ticket can continue through chat and agent review."}
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Link href={`/tickets/${ticket.id}`}>
                            <Button variant="outline">View summary</Button>
                          </Link>
                          <Link href={continueHref}>
                            <Button>
                              {ticket.status === "resolved" ||
                              ticket.status === "closed"
                                ? "Review support"
                                : "Continue support"}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
