"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, RefreshCw } from "lucide-react";

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
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
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

export function AdminMagicLinksPanel({ ticketId }: { ticketId: string }) {
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<MagicLinkRow[]>([]);
  const [revokeTarget, setRevokeTarget] = useState<MagicLinkRow | null>(null);
  const [extendTarget, setExtendTarget] = useState<MagicLinkRow | null>(null);
  const [extendHours, setExtendHours] = useState<number>(48);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/magic-links?ticketId=${encodeURIComponent(ticketId)}`,
        { cache: "no-store" },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to load magic links");
      }
      setLinks(Array.isArray(json.links) ? json.links : []);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load magic links");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

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

  const activeLink = links.find((l) => l.status === "active") ?? null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" /> Payment links
            </CardTitle>
            <CardDescription>
              Magic links created for this ticket. Revoke an active link to
              terminate guest access, or extend an expired link to give the
              customer another window.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Created</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created by</TableHead>
              <TableHead>Visits</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
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
                    {formatDate(row.expiresAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{creator}</div>
                    {row.guestEmail && (
                      <div className="text-xs text-muted-foreground">
                        Guest: {row.guestEmail}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{row.visitCount}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.lastVisitedAt
                        ? `Last ${formatDate(row.lastVisitedAt)}`
                        : "Never visited"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.status === "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRevokeTarget(row)}
                      >
                        Revoke
                      </Button>
                    )}
                    {row.status === "expired" && (
                      <Button size="sm" onClick={() => openExtend(row)}>
                        Extend
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && !links.length ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  No magic links have been generated for this ticket.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>

        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          {activeLink ? (
            <>
              The original link URL is only shown at generation time. To give
              the customer a new URL, revoke this link and have the agent
              generate a new one.
            </>
          ) : (
            <>
              No active link right now. Have the agent generate a new one from
              the ticket workspace.
            </>
          )}
        </div>
      </CardContent>

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
              Extends the link&apos;s window starting from now. The customer
              can reuse the URL they already have; they&apos;ll get a fresh
              48h guest session on their next visit.
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
    </Card>
  );
}
