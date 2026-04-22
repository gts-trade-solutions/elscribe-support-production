"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Ban,
  Clock,
  Link2,
  MousePointerClick,
  RefreshCw,
} from "lucide-react";

type StatusFilter = "active" | "expired" | "revoked" | "all";

type MagicLinkRow = {
  id: string;
  ticketId: string;
  guestUserId: string;
  guestEmail: string | null;
  createdByUserId: string;
  createdByEmail: string | null;
  createdByAgentAlias: string | null;
  expiresAt: string;
  revokedAt: string | null;
  revokedByUserId: string | null;
  lastVisitedAt: string | null;
  visitCount: number;
  createdAt: string;
  updatedAt: string;
  status: "active" | "expired" | "revoked";
  ticketSubject: string | null;
};

type SummaryResponse = {
  active: number;
  expired: number;
  revoked: number;
  unvisitedActive: number;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function truncate(value: string | null, max = 60) {
  if (!value) return "—";
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function StatusBadge({ status }: { status: MagicLinkRow["status"] }) {
  if (status === "active") {
    return (
      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
        Active
      </Badge>
    );
  }
  if (status === "expired") {
    return <Badge variant="secondary">Expired</Badge>;
  }
  return <Badge variant="destructive">Revoked</Badge>;
}

export default function AdminMagicLinksPage() {
  const [status, setStatus] = useState<StatusFilter>("active");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<MagicLinkRow[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<MagicLinkRow | null>(null);
  const [extendTarget, setExtendTarget] = useState<MagicLinkRow | null>(null);
  const [extendHours, setExtendHours] = useState<number>(48);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(
    async (next?: { status?: StatusFilter; search?: string }) => {
      const nextStatus = next?.status ?? status;
      const nextSearch = next?.search ?? search;
      setLoading(true);
      try {
        const qs = new URLSearchParams({ status: nextStatus });
        if (nextSearch.trim()) qs.set("search", nextSearch.trim());
        const [listRes, summaryRes] = await Promise.all([
          fetch(`/api/admin/magic-links?${qs.toString()}`, {
            cache: "no-store",
          }),
          fetch(`/api/admin/magic-links/summary`, { cache: "no-store" }),
        ]);
        const listJson = await listRes.json().catch(() => ({}));
        const summaryJson = await summaryRes.json().catch(() => ({}));
        if (!listRes.ok) {
          throw new Error(listJson?.error || "Failed to load magic links");
        }
        if (summaryRes.ok) setSummary(summaryJson as SummaryResponse);
        setLinks(Array.isArray(listJson.links) ? listJson.links : []);
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load magic links");
      } finally {
        setLoading(false);
      }
    },
    [status, search],
  );

  useEffect(() => {
    load({ status: "active", search: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summaryCards = useMemo(
    () => [
      {
        title: "Active links",
        value: summary?.active ?? 0,
        description: "Live links customers can still use.",
        icon: Link2,
      },
      {
        title: "Expired links",
        value: summary?.expired ?? 0,
        description: "Past their window — extend to restore access.",
        icon: Clock,
      },
      {
        title: "Revoked total",
        value: summary?.revoked ?? 0,
        description: "Links admins or agents have terminated.",
        icon: Ban,
      },
      {
        title: "Unvisited active",
        value: summary?.unvisitedActive ?? 0,
        description: "Active links the customer has not clicked yet.",
        icon: MousePointerClick,
      },
    ],
    [summary],
  );

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/magic-links/${revokeTarget.id}/revoke`,
        { method: "POST" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to revoke");
      }
      toast.success("Link revoked");
      setRevokeTarget(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to revoke link");
    } finally {
      setSubmitting(false);
    }
  };

  const openExtend = (row: MagicLinkRow) => {
    setExtendHours(48);
    setExtendTarget(row);
  };

  const submitExtend = async () => {
    if (!extendTarget) return;
    const hours = Number(extendHours);
    if (!Number.isFinite(hours) || hours < 1 || hours > 168) {
      toast.error("Hours must be between 1 and 168");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/magic-links/${extendTarget.id}/extend`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hours }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message ?? json?.error ?? "Failed to extend");
      }
      toast.success(`Link extended by ${hours}h`);
      setExtendTarget(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to extend link");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Magic links</h1>
              <p className="mt-2 max-w-3xl text-muted-foreground">
                Shareable payment links across all tickets. Revoke active links,
                extend expired ones, and see who clicked what.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={status}
                onValueChange={(v: StatusFilter) => {
                  setStatus(v);
                  load({ status: v });
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") load();
                }}
                placeholder="Search by guest email or ticket id"
                className="w-72"
              />
              <Button
                variant="outline"
                onClick={() => load()}
                disabled={loading}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((item) => {
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
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" /> Magic link overview
              </CardTitle>
              <CardDescription>
                All magic links across tickets. Use the actions column to revoke
                or extend. Click a ticket subject to jump into the admin ticket
                view.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Guest email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Visits</TableHead>
                    <TableHead>Created by</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && !links.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-muted-foreground"
                      >
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {!loading && !links.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-muted-foreground"
                      >
                        No magic links match these filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {links.map((row) => {
                    const creator =
                      row.createdByAgentAlias ||
                      row.createdByEmail ||
                      row.createdByUserId;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="text-sm">
                          {formatDate(row.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          <Link
                            href={`/admin/tickets/${row.ticketId}`}
                            className="text-primary underline underline-offset-2 hover:no-underline"
                          >
                            {truncate(row.ticketSubject)}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {row.ticketId}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.guestEmail || "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.status} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(row.expiresAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{row.visitCount}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.lastVisitedAt
                              ? `Last ${formatDate(row.lastVisitedAt)}`
                              : "Never visited"}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{creator}</TableCell>
                        <TableCell className="text-right">
                          {row.status === "active" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRevokeTarget(row)}
                            >
                              Revoke
                            </Button>
                          ) : null}
                          {row.status === "expired" ? (
                            <Button size="sm" onClick={() => openExtend(row)}>
                              Extend
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this magic link?</AlertDialogTitle>
            <AlertDialogDescription>
              The link will stop working immediately. If the customer still
              needs access, the agent will have to generate a fresh link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevoke} disabled={submitting}>
              {submitting ? "Revoking…" : "Revoke link"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!extendTarget}
        onOpenChange={(open) => !open && setExtendTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend magic link</DialogTitle>
            <DialogDescription>
              Extends the link&apos;s window starting from now. The customer can
              reuse the URL they already have; they&apos;ll get a fresh 48h
              guest session on their next visit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="extend-hours">Hours (1–168)</Label>
            <Input
              id="extend-hours"
              type="number"
              min={1}
              max={168}
              value={extendHours}
              onChange={(e) => setExtendHours(Number(e.target.value))}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExtendTarget(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={submitExtend} disabled={submitting}>
              {submitting ? "Extending…" : "Extend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
