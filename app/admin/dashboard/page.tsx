"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "../../app-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  CheckCircle2,
  Headset,
  ShieldCheck,
  Users,
  UserCog,
  CreditCard,
  RefreshCw,
  ClipboardList,
  FileText,
  Receipt,
  CircleDollarSign,
  AlertTriangle,
} from "lucide-react";

type Metrics = {
  totalCustomers: number;
  totalAgents: number;
  totalAdmins: number;
  totalTickets: number;
  unassignedTickets: number;
  planCoveredTickets: number;
  billingBlockedTickets: number;
};

type PaymentMetrics = {
  totalTransactions: number;
  succeededTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  refundedTransactions: number;
  succeededDisplayAmount: number;
  succeededDisplayCurrency: string;
  successRatePercent: number;
};

type AgentRequest = { id: string };

type QueueTicket = {
  quoteRequired: boolean;
};

function formatMinor(amount: number, currency: string) {
  return `${currency} ${(Number(amount || 0) / 100).toFixed(2)}`;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<AgentRequest[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [queueTickets, setQueueTickets] = useState<QueueTicket[]>([]);
  const [paymentMetrics, setPaymentMetrics] = useState<PaymentMetrics | null>(
    null,
  );

  const refresh = async () => {
    setLoading(true);
    try {
      const [requestsRes, ticketsRes, paymentsRes] = await Promise.all([
        fetch("/api/admin/agent-requests", { cache: "no-store" }),
        fetch("/api/admin/tickets", { cache: "no-store" }),
        fetch("/api/admin/payments", { cache: "no-store" }),
      ]);

      const [requestsJson, ticketsJson, paymentsJson] = await Promise.all([
        requestsRes.json(),
        ticketsRes.json(),
        paymentsRes.json(),
      ]);

      if (requestsRes.ok) setPendingRequests(requestsJson.items || []);
      if (ticketsRes.ok) {
        setMetrics(ticketsJson.metrics || null);
        setQueueTickets(ticketsJson.tickets || []);
      }
      if (paymentsRes.ok) setPaymentMetrics(paymentsJson.metrics || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const stats = useMemo(() => {
    const pendingQuotes = queueTickets.filter(
      (ticket) => ticket.quoteRequired,
    ).length;
    return {
      pendingRequests: pendingRequests.length,
      customers: metrics?.totalCustomers ?? 0,
      agents: (metrics?.totalAgents ?? 0) + (metrics?.totalAdmins ?? 0),
      tickets: metrics?.totalTickets ?? 0,
      unassignedTickets: metrics?.unassignedTickets ?? 0,
      billingBlocked: metrics?.billingBlockedTickets ?? 0,
      pendingQuotes,
      totalTransactions: paymentMetrics?.totalTransactions ?? 0,
      succeededTransactions: paymentMetrics?.succeededTransactions ?? 0,
      pendingTransactions: paymentMetrics?.pendingTransactions ?? 0,
      failedTransactions: paymentMetrics?.failedTransactions ?? 0,
      capturedDisplayAmount: paymentMetrics?.succeededDisplayAmount ?? 0,
      capturedDisplayCurrency:
        paymentMetrics?.succeededDisplayCurrency ?? "USD",
      paymentSuccessRate: paymentMetrics?.successRatePercent ?? 0,
    };
  }, [metrics, paymentMetrics, pendingRequests, queueTickets]);

  const adminCards = [
    {
      title: "Customers",
      value: stats.customers,
      description:
        "All customer accounts across individual and company workspaces.",
      icon: Users,
      href: "/admin/customers",
      cta: "Open customers",
    },
    {
      title: "Operators",
      value: stats.agents,
      description: "Agents and admins who can work tickets.",
      icon: UserCog,
      href: "/admin/agents",
      cta: "Open operators",
    },
    {
      title: "All tickets",
      value: stats.tickets,
      description:
        "Global ticket view for assignment, status, and priority management.",
      icon: ClipboardList,
      href: "/admin/tickets",
      cta: "Manage tickets",
    },
    {
      title: "Unassigned queue",
      value: stats.unassignedTickets,
      description: "Tickets still waiting for an operator.",
      icon: Headset,
      href: "/admin/tickets?assignment=unassigned",
      cta: "Review queue",
    },
    {
      title: "Billing blocked",
      value: stats.billingBlocked,
      description:
        "Tickets still waiting on payment, quote, or incident selection.",
      icon: CreditCard,
      href: "/admin/tickets?billing=blocked",
      cta: "Inspect blocked work",
    },
    {
      title: "Pending quotes",
      value: stats.pendingQuotes,
      description: "Quoted incidents still waiting on an admin-issued amount.",
      icon: FileText,
      href: "/admin/tickets?billing=quote_pending",
      cta: "Review quote-needed",
    },
    {
      title: "Pending agent requests",
      value: stats.pendingRequests,
      description: "Requests that still need an admin decision.",
      icon: ShieldCheck,
      href: "/admin/agent-requests",
      cta: "Review requests",
    },
    {
      title: "Transactions",
      value: stats.totalTransactions,
      description: "All incident and subscription payment records.",
      icon: Receipt,
      href: "/admin/payments",
      cta: "Open transactions",
    },
    {
      title: "Captured volume",
      value: formatMinor(
        stats.capturedDisplayAmount,
        stats.capturedDisplayCurrency,
      ),
      description: "Successful product-side revenue tracked in USD.",
      icon: CircleDollarSign,
      href: "/admin/payments?status=succeeded",
      cta: "Review captured",
    },
    {
      title: "Payment exceptions",
      value: stats.pendingTransactions + stats.failedTransactions,
      description: `Pending: ${stats.pendingTransactions} · Failed: ${stats.failedTransactions} · Success rate: ${stats.paymentSuccessRate.toFixed(1)}%`,
      icon: AlertTriangle,
      href: "/admin/payments?status=pending",
      cta: "Review exceptions",
    },
  ];

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Admin dashboard
              </h1>
              <p className="mt-2 max-w-3xl text-muted-foreground">
                Use this control center to manage users, assign operators, and
                monitor the billing and quote states that affect ticket flow.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Operations</Badge>
              <Badge variant="outline">Alias-only model</Badge>
              <Button variant="outline" onClick={refresh} disabled={loading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {adminCards.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="flex flex-col">
                  <CardHeader>
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-muted/40">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardDescription>{item.title}</CardDescription>
                    <CardTitle className="text-4xl">{item.value}</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {item.description}
                    </div>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <Button asChild variant="outline" className="w-full">
                      <Link href={item.href}>
                        {item.cta}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ShieldCheck className="h-5 w-5" />
                  Operational guardrails
                </CardTitle>
                <CardDescription>
                  The admin workflow should keep these rules consistent.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "Agents should only work tickets through alias-safe views.",
                  "Paid company-plan tickets should stay clearly marked as included work while individual incidents still follow payment or quote rules.",
                  "Seat entitlements and fair-usage limits should stay aligned to the same company plan state shown in billing.",
                  "Admin should be able to assign, reprioritize, and inspect tickets without leaving the management shell.",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-lg border p-4 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Users className="h-5 w-5" />
                  Quick links
                </CardTitle>
                <CardDescription>
                  Move directly into the section that needs attention.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    title: "Customers",
                    body: "Review all customers and their active account context.",
                    href: "/admin/customers",
                  },
                  {
                    title: "Operators",
                    body: "See which agents are active and how much work they hold.",
                    href: "/admin/agents",
                  },
                  {
                    title: "Tickets",
                    body: "Assign or reassign tickets and update priority or status.",
                    href: "/admin/tickets",
                  },
                  {
                    title: "Agent requests",
                    body: "Approve or reject internal agent-access requests.",
                    href: "/admin/agent-requests",
                  },
                  {
                    title: "Payments",
                    body: "Inspect transaction volume, failed captures, and subscription payments.",
                    href: "/admin/payments",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-lg border p-4">
                    <div className="font-medium">{item.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {item.body}
                    </div>
                    <div className="mt-3">
                      <Button asChild variant="outline" size="sm">
                        <Link href={item.href}>Open</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
