"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/app/app-layout";
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, RefreshCw, Receipt, ArrowUpRight } from "lucide-react";

type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";
type PaymentType = "incident" | "subscription";

type PaymentRow = {
  id: string;
  accountId: string;
  accountType: "individual" | "company" | null;
  accountBillingStatus: string | null;
  ticketId: string | null;
  planCode: string | null;
  type: PaymentType;
  status: PaymentStatus;
  provider: string;
  processorAmount: number;
  processorCurrency: string;
  displayAmount: number;
  displayCurrency: string;
  createdAt: string;
  updatedAt: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  ticketSubject: string | null;
  incidentTypeSelected: string | null;
  agentAlias: string | null;
  creatorEmail: string | null;
};

type Metrics = {
  totalTransactions: number;
  succeededTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  refundedTransactions: number;
  incidentTransactions: number;
  subscriptionTransactions: number;
  succeededDisplayAmount: number;
  succeededDisplayCurrency: string;
  succeededProcessorAmount: number;
  succeededProcessorCurrency: string;
  incidentSucceededDisplayAmount: number;
  subscriptionSucceededDisplayAmount: number;
  pendingProcessorAmount: number;
  successRatePercent: number;
};

function formatMinor(amount: number, currency: string) {
  return `${currency} ${(Number(amount || 0) / 100).toFixed(2)}`;
}

function statusBadgeVariant(status: PaymentStatus) {
  if (status === "succeeded") return "secondary" as const;
  if (status === "failed") return "destructive" as const;
  if (status === "refunded") return "outline" as const;
  return "outline" as const;
}

function readFiltersFromUrl() {
  if (typeof window === "undefined") {
    return { status: "all", type: "all", search: "" };
  }
  const qs = new URLSearchParams(window.location.search);
  return {
    status: qs.get("status") || "all",
    type: qs.get("type") || "all",
    search: qs.get("search") || "",
  };
}

function writeFiltersToUrl(filters: {
  status: string;
  type: string;
  search: string;
}) {
  if (typeof window === "undefined") return;
  const qs = new URLSearchParams();
  if (filters.status !== "all") qs.set("status", filters.status);
  if (filters.type !== "all") qs.set("type", filters.type);
  if (filters.search.trim()) qs.set("search", filters.search.trim());
  const next = qs.toString();
  window.history.replaceState(
    null,
    "",
    next ? `/admin/payments?${next}` : "/admin/payments",
  );
}

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = async (override?: {
    status?: string;
    type?: string;
    search?: string;
  }) => {
    const nextFilters = {
      status: override?.status ?? statusFilter,
      type: override?.type ?? typeFilter,
      search: override?.search ?? search,
    };

    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (nextFilters.status !== "all") qs.set("status", nextFilters.status);
      if (nextFilters.type !== "all") qs.set("type", nextFilters.type);
      if (nextFilters.search.trim())
        qs.set("search", nextFilters.search.trim());
      const res = await fetch(`/api/admin/payments?${qs.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok) {
        setPayments(json.payments || []);
        setMetrics(json.metrics || null);
      }
      writeFiltersToUrl(nextFilters);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initial = readFiltersFromUrl();
    setStatusFilter(initial.status);
    setTypeFilter(initial.type);
    setSearch(initial.search);
    load(initial);
  }, []);

  const summaryCards = useMemo(() => {
    const m = metrics;
    return [
      {
        title: "Captured volume",
        value: formatMinor(
          m?.succeededDisplayAmount ?? 0,
          m?.succeededDisplayCurrency ?? "USD",
        ),
        note: `Processor test volume ${formatMinor(m?.succeededProcessorAmount ?? 0, m?.succeededProcessorCurrency ?? "INR")}`,
      },
      {
        title: "Transactions",
        value: String(m?.totalTransactions ?? payments.length),
        note: `${m?.succeededTransactions ?? 0} succeeded · ${m?.pendingTransactions ?? 0} pending · ${m?.failedTransactions ?? 0} failed`,
      },
      {
        title: "Incident revenue",
        value: formatMinor(
          m?.incidentSucceededDisplayAmount ?? 0,
          m?.succeededDisplayCurrency ?? "USD",
        ),
        note: `${m?.incidentTransactions ?? 0} incident transactions logged`,
      },
      {
        title: "Subscription revenue",
        value: formatMinor(
          m?.subscriptionSucceededDisplayAmount ?? 0,
          m?.succeededDisplayCurrency ?? "USD",
        ),
        note: `${m?.subscriptionTransactions ?? 0} subscription transactions logged`,
      },
      {
        title: "Pending processor volume",
        value: formatMinor(
          m?.pendingProcessorAmount ?? 0,
          m?.succeededProcessorCurrency ?? "INR",
        ),
        note: "Temporary processor-side value awaiting success/failure state.",
      },
      {
        title: "Success rate",
        value: `${(m?.successRatePercent ?? 0).toFixed(1)}%`,
        note: `${m?.refundedTransactions ?? 0} refunded transactions recorded`,
      },
    ];
  }, [metrics, payments.length]);

  return (
    <AppLayout>
      <div className="px-4 py-8 sm:px-6 xl:px-8 2xl:px-10">
        <div className="w-full max-w-none space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
              <p className="mt-2 text-muted-foreground">
                Review incident and subscription transactions, capture state,
                processor references, and the display-vs-processor currency
                split used in the current Razorpay test setup.
              </p>
            </div>
            <Button variant="outline" onClick={() => load()} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {summaryCards.map((card) => (
              <Card key={card.title}>
                <CardHeader>
                  <CardDescription>{card.title}</CardDescription>
                  <CardTitle className="text-3xl break-words">
                    {card.value}
                  </CardTitle>
                  <div className="text-xs text-muted-foreground">
                    {card.note}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Transaction filters
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search payment, order, ticket, email"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="succeeded">Succeeded</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="incident">Incident</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => load()}>Apply filters</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" /> Transaction log
              </CardTitle>
              <CardDescription>
                Display amounts stay in USD for product reporting, while
                processor values remain in INR during the current Razorpay test
                phase.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Type / status</TableHead>
                    <TableHead>Display value</TableHead>
                    <TableHead>Processor value</TableHead>
                    <TableHead>Context</TableHead>
                    <TableHead>References</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="align-top">
                        <div className="font-medium">{payment.id}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(payment.createdAt).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{payment.type}</Badge>
                          <Badge variant={statusBadgeVariant(payment.status)}>
                            {payment.status}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {payment.accountType || "—"} ·{" "}
                          {payment.accountBillingStatus || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="font-medium">
                          {formatMinor(
                            payment.displayAmount,
                            payment.displayCurrency,
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Product reporting currency
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="font-medium">
                          {formatMinor(
                            payment.processorAmount,
                            payment.processorCurrency,
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Processor test currency
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        {payment.type === "incident" ? (
                          <>
                            <div className="font-medium">
                              {payment.ticketSubject ||
                                payment.agentAlias ||
                                "Incident ticket"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {payment.creatorEmail || "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {payment.incidentTypeSelected ||
                                "incident not selected"}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-medium">
                              {payment.planCode || "company plan"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Account {payment.accountId}
                            </div>
                          </>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="text-xs">
                          Order: {payment.razorpayOrderId || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Payment: {payment.razorpayPaymentId || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-right">
                        {payment.ticketId ? (
                          <Button asChild size="sm" variant="outline">
                            <Link
                              href={`/agent/console?ticketId=${payment.ticketId}`}
                            >
                              Open ticket
                              <ArrowUpRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No ticket
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!payments.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground"
                      >
                        No transactions found.
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
