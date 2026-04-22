"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/app/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Link2, RefreshCw, ShieldCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CreateMagicLinkDialog } from "@/components/agent/create-magic-link-dialog";

type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_customer"
  | "resolved"
  | "closed";
type TicketPriority = "low" | "medium" | "high" | "critical";
type BillingOverrideState = "system" | "cleared" | "blocked";

type TicketRow = {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  creatorEmail: string;
  assignedAgentId: string | null;
  assignedAgentEmail: string | null;
  agentAlias: string;
  incidentTypeSelected: string | null;
  paymentRequired: boolean;
  quoteRequired: boolean;
  quoteAvailable: boolean;
  isPaid: boolean;
  coveredByPlan: boolean;
  billingOverrideState: Exclude<BillingOverrideState, "system"> | null;
  hasMagicLink: boolean;
  hasActiveMagicLink: boolean;
  awaitingResponse: boolean;
};

type Operator = { id: string; email: string; role: "agent" | "admin" };

type Metrics = {
  totalCustomers: number;
  totalAgents: number;
  totalAdmins: number;
  totalTickets: number;
  unassignedTickets: number;
  planCoveredTickets: number;
  billingBlockedTickets: number;
};

function readFiltersFromUrl() {
  if (typeof window === "undefined") {
    return {
      status: "all",
      assignment: "all",
      billing: "all",
      search: "",
    };
  }
  const qs = new URLSearchParams(window.location.search);
  return {
    status: qs.get("status") || "all",
    assignment: qs.get("assignment") || "all",
    billing: qs.get("billing") || "all",
    search: qs.get("search") || "",
  };
}

function writeFiltersToUrl(filters: {
  status: string;
  assignment: string;
  billing: string;
  search: string;
}) {
  if (typeof window === "undefined") return;
  const qs = new URLSearchParams();
  if (filters.status !== "all") qs.set("status", filters.status);
  if (filters.assignment !== "all") qs.set("assignment", filters.assignment);
  if (filters.billing !== "all") qs.set("billing", filters.billing);
  if (filters.search.trim()) qs.set("search", filters.search.trim());
  const next = qs.toString();
  const url = next ? `/admin/tickets?${next}` : "/admin/tickets";
  window.history.replaceState(null, "", url);
}

function billingLabel(ticket: TicketRow) {
  if (ticket.billingOverrideState === "cleared") {
    return { text: "Billing cleared", variant: "secondary" as const };
  }
  if (ticket.billingOverrideState === "blocked") {
    return { text: "Billing blocked", variant: "destructive" as const };
  }
  if (ticket.coveredByPlan)
    return { text: "Included in plan", variant: "secondary" as const };
  if (ticket.isPaid) return { text: "Paid", variant: "secondary" as const };
  if (ticket.quoteRequired)
    return { text: "Quote pending", variant: "outline" as const };
  if (ticket.quoteAvailable || ticket.paymentRequired)
    return { text: "Payment required", variant: "outline" as const };
  if (!ticket.incidentTypeSelected)
    return { text: "Incident required", variant: "outline" as const };
  return { text: "Ready", variant: "outline" as const };
}

export default function AdminTicketsPage() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [billingFilter, setBillingFilter] = useState("all");
  const [drafts, setDrafts] = useState<
    Record<
      string,
      {
        status: TicketStatus;
        priority: TicketPriority;
        assignedAgentId: string | null;
        billingOverrideState: BillingOverrideState;
      }
    >
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async (override?: {
    status?: string;
    assignment?: string;
    billing?: string;
    search?: string;
  }) => {
    const nextFilters = {
      status: override?.status ?? statusFilter,
      assignment: override?.assignment ?? assignmentFilter,
      billing: override?.billing ?? billingFilter,
      search: override?.search ?? search,
    };

    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (nextFilters.status !== "all") qs.set("status", nextFilters.status);
      if (nextFilters.assignment !== "all")
        qs.set("assignment", nextFilters.assignment);
      if (nextFilters.billing !== "all") qs.set("billing", nextFilters.billing);
      if (nextFilters.search.trim())
        qs.set("search", nextFilters.search.trim());
      const res = await fetch(`/api/admin/tickets?${qs.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok) {
        const loadedTickets = json.tickets || [];
        setTickets(loadedTickets);
        setOperators(json.agents || []);
        setMetrics(json.metrics || null);
        setDrafts(
          Object.fromEntries(
            loadedTickets.map((t: TicketRow) => [
              t.id,
              {
                status: t.status,
                priority: t.priority,
                assignedAgentId: t.assignedAgentId,
                billingOverrideState: t.billingOverrideState || "system",
              },
            ]),
          ),
        );
      }
      writeFiltersToUrl(nextFilters);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initial = readFiltersFromUrl();
    setSearch(initial.search);
    setStatusFilter(initial.status);
    setAssignmentFilter(initial.assignment);
    setBillingFilter(initial.billing);
    load(initial);
  }, []);

  const summaryCards = useMemo(
    () => [
      {
        title: "Total tickets",
        value: metrics?.totalTickets ?? tickets.length,
      },
      {
        title: "Unassigned",
        value:
          metrics?.unassignedTickets ??
          tickets.filter((t) => !t.assignedAgentId).length,
      },
      {
        title: "Plan covered",
        value:
          metrics?.planCoveredTickets ??
          tickets.filter((t) => t.coveredByPlan).length,
      },
      {
        title: "Billing blocked",
        value:
          metrics?.billingBlockedTickets ??
          tickets.filter(
            (t) =>
              t.billingOverrideState === "blocked" ||
              t.paymentRequired ||
              t.quoteRequired ||
              (!t.coveredByPlan && !t.isPaid && !t.incidentTypeSelected),
          ).length,
      },
    ],
    [metrics, tickets],
  );

  const updateDraft = (
    ticketId: string,
    patch: Partial<{
      status: TicketStatus;
      priority: TicketPriority;
      assignedAgentId: string | null;
      billingOverrideState: BillingOverrideState;
    }>,
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [ticketId]: {
        status: patch.status ?? prev[ticketId]?.status ?? "open",
        priority: patch.priority ?? prev[ticketId]?.priority ?? "medium",
        assignedAgentId:
          patch.assignedAgentId === undefined
            ? (prev[ticketId]?.assignedAgentId ?? null)
            : patch.assignedAgentId,
        billingOverrideState:
          patch.billingOverrideState ??
          prev[ticketId]?.billingOverrideState ??
          "system",
      },
    }));
  };

  const saveTicket = async (ticketId: string) => {
    const draft = drafts[ticketId];
    if (!draft) return;
    setSavingId(ticketId);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (res.ok) await load();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="px-4 py-8 sm:px-6 xl:px-8 2xl:px-10">
        <div className="w-full max-w-none space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Admin tickets
              </h1>
              <p className="mt-2 text-muted-foreground">
                Search all tickets, assign or unassign operators, correct status
                or priority, and manually clear or block billing when a real
                business exception needs intervention.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CreateMagicLinkDialog viewerRole="admin" />
              <Button variant="outline" onClick={() => load()} disabled={loading}>
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {summaryCards.map((card) => (
              <Card key={card.title}>
                <CardHeader>
                  <CardDescription>{card.title}</CardDescription>
                  <CardTitle className="text-3xl">{card.value}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" /> Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subject, alias, email, id"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="waiting_customer">
                    Waiting customer
                  </SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={assignmentFilter}
                onValueChange={setAssignmentFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tickets</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
              <Select value={billingFilter} onValueChange={setBillingFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Billing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All billing states</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="included">Included in plan</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="quote_pending">Quote pending</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex justify-end md:col-span-4">
                <Button onClick={() => load()} disabled={loading}>
                  Apply filters
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All tickets</CardTitle>
              <CardDescription>
                Admin can reassign, reprioritize, adjust billing state, and move
                tickets through the right status without relying on the
                queue-only view.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-4 lg:px-6">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[18%]">Ticket</TableHead>
                    <TableHead className="w-[16%]">Customer / Alias</TableHead>
                    <TableHead className="w-[18%]">Billing</TableHead>
                    <TableHead className="w-[16%]">Assignee</TableHead>
                    <TableHead className="w-[10%]">Status</TableHead>
                    <TableHead className="w-[10%]">Priority</TableHead>
                    <TableHead className="w-[12%] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => {
                    const draft = drafts[ticket.id] || {
                      status: ticket.status,
                      priority: ticket.priority,
                      assignedAgentId: ticket.assignedAgentId,
                      billingOverrideState:
                        ticket.billingOverrideState || "system",
                    };
                    const badge = billingLabel(ticket);
                    return (
                      <TableRow
                        key={ticket.id}
                        className={
                          ticket.awaitingResponse
                            ? "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
                            : ""
                        }
                      >
                        <TableCell className="align-top">
                          {ticket.awaitingResponse ? (
                            <div className="mb-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="destructive"
                                      className="flex w-fit items-center gap-1"
                                    >
                                      <AlertCircle className="h-3 w-3" />
                                      Awaiting response
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Payment received. Customer is waiting for
                                    your first response.
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          ) : null}
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/admin/tickets/${ticket.id}`}
                              className="truncate font-medium text-primary underline underline-offset-2 hover:opacity-80"
                            >
                              {ticket.subject}
                            </Link>
                            {ticket.hasMagicLink ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Link
                                      href={`/admin/tickets/${ticket.id}`}
                                      aria-label="View magic links for this ticket"
                                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${
                                        ticket.hasActiveMagicLink
                                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                          : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      <Link2 className="h-3 w-3" />
                                    </Link>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {ticket.hasActiveMagicLink
                                      ? "Has active magic link — click to manage"
                                      : "Created via magic link — click to manage"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : null}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {ticket.id}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {ticket.incidentTypeSelected ||
                              "No incident selected"}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="truncate font-medium">
                            {ticket.creatorEmail}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {ticket.agentAlias}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="space-y-2">
                            <Badge variant={badge.variant}>{badge.text}</Badge>
                            <Select
                              value={draft.billingOverrideState}
                              onValueChange={(value: BillingOverrideState) =>
                                updateDraft(ticket.id, {
                                  billingOverrideState: value,
                                })
                              }
                            >
                              <SelectTrigger className="h-9 w-full min-w-0">
                                <SelectValue placeholder="Billing control" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="system">
                                  System derived
                                </SelectItem>
                                <SelectItem value="cleared">
                                  Clear billing
                                </SelectItem>
                                <SelectItem value="blocked">
                                  Block billing
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <Select
                            value={draft.assignedAgentId ?? "unassigned"}
                            onValueChange={(value) =>
                              updateDraft(ticket.id, {
                                assignedAgentId:
                                  value === "unassigned" ? null : value,
                              })
                            }
                          >
                            <SelectTrigger className="h-9 w-full min-w-0">
                              <SelectValue placeholder="Assign operator" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">
                                Unassigned
                              </SelectItem>
                              {operators.map((op) => (
                                <SelectItem key={op.id} value={op.id}>
                                  {op.email} ({op.role})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="align-top">
                          <Select
                            value={draft.status}
                            onValueChange={(value: TicketStatus) =>
                              updateDraft(ticket.id, { status: value })
                            }
                          >
                            <SelectTrigger className="h-9 w-full min-w-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">
                                In progress
                              </SelectItem>
                              <SelectItem value="waiting_customer">
                                Waiting customer
                              </SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="align-top">
                          <Select
                            value={draft.priority}
                            onValueChange={(value: TicketPriority) =>
                              updateDraft(ticket.id, { priority: value })
                            }
                          >
                            <SelectTrigger className="h-9 w-full min-w-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="align-top text-right">
                          <div className="flex flex-col items-end gap-2">
                            <Button
                              variant="outline"
                              asChild
                              className="w-full xl:w-auto"
                            >
                              <Link
                                href={`/agent/console?ticketId=${ticket.id}`}
                              >
                                Open workspace
                              </Link>
                            </Button>
                            <Button
                              onClick={() => saveTicket(ticket.id)}
                              disabled={savingId === ticket.id}
                              className="w-full xl:w-auto"
                            >
                              Save
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!tickets.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground"
                      >
                        No tickets found for the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
