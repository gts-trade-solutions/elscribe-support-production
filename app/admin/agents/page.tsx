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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, UserCog } from "lucide-react";

type AgentRow = {
  id: string;
  email: string;
  role: "agent" | "admin";
  activeAccountType: "individual" | "company" | null;
  membershipRole: "owner" | "member" | null;
  planCode: string | null;
  billingStatus: string | null;
  createdAt: string;
  openAssignedTickets: number;
  latestAgentDecisionNote: string | null;
};

export default function AdminAgentsPage() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentRow[]>([]);

  const load = async (nextSearch = search) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ role: "agent" });
      if (nextSearch.trim()) qs.set("search", nextSearch.trim());
      const res = await fetch(`/api/admin/users?${qs.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok) setAgents(json.users || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load("");
  }, []);

  const summary = useMemo(
    () => ({
      total: agents.length,
      busy: agents.filter((a) => a.openAssignedTickets > 0).length,
    }),
    [agents],
  );

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
              <p className="mt-2 text-muted-foreground">
                View all active operators, their current ticket load, and the
                account context they are working from.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email or user id"
                className="w-72"
              />
              <Button
                variant="outline"
                onClick={() => load(search)}
                disabled={loading}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardDescription>Total operator accounts</CardDescription>
                <CardTitle className="text-3xl">{summary.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Currently holding tickets</CardDescription>
                <CardTitle className="text-3xl">{summary.busy}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" /> Operator directory
              </CardTitle>
              <CardDescription>
                Approval notes are shown when available so admins can trace why
                a user was promoted to agent access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Active workspace</TableHead>
                    <TableHead>Open tickets</TableHead>
                    <TableHead>Approval note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div className="font-medium">{agent.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {agent.id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{agent.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {agent.activeAccountType || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {agent.membershipRole || "—"}
                        </div>
                      </TableCell>
                      <TableCell>{agent.openAssignedTickets}</TableCell>
                      <TableCell className="max-w-sm text-sm text-muted-foreground">
                        {agent.latestAgentDecisionNote || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!agents.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        No agents found.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
              <div className="mt-4 text-sm text-muted-foreground">
                Need to approve new operators?{" "}
                <Link className="underline" href="/admin/agent-requests">
                  Open agent requests
                </Link>
                .
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
