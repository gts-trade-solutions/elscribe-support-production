"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
import { ClipboardList, Info, MessageSquare, ShieldCheck } from "lucide-react";

type LatestRequest = {
  id: string;
  status: "pending" | "approved" | "rejected";
  reason: string | null;
  created_at: string;
  decision_note: string | null;
  decided_at: string | null;
} | null;

export default function AgentSettingsPage() {
  const { data: session, status } = useSession();
  const [latest, setLatest] = useState<LatestRequest>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings/agent-request", {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) setLatest(data.latest ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const user = session?.user as
    | {
        email?: string | null;
        role?: string;
        accountType?: string;
        membershipRole?: string;
      }
    | undefined;

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Agent settings
              </h1>
              <p className="mt-2 text-muted-foreground">
                Review your operator workspace context, the latest approval
                note, and live-support guidance.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">agent</Badge>
              <Badge variant="outline">
                {user?.accountType || "individual"}
              </Badge>
              <Badge variant="outline">{user?.membershipRole || "owner"}</Badge>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Operator profile</CardTitle>
                <CardDescription>
                  This is the active account context currently attached to your
                  agent workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Email
                  </div>
                  <div className="mt-2 break-all font-medium">
                    {user?.email || "Not available"}
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Role
                  </div>
                  <div className="mt-2 font-medium">
                    {user?.role || "agent"}
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Membership
                  </div>
                  <div className="mt-2 font-medium">
                    {user?.membershipRole || "owner"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5" />
                  Access approval
                </CardTitle>
                <CardDescription>
                  The latest admin decision associated with your agent-access
                  request.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {loading ? (
                  <div className="text-muted-foreground">
                    Loading approval details…
                  </div>
                ) : latest ? (
                  <>
                    <Badge
                      variant={
                        latest.status === "approved"
                          ? "secondary"
                          : latest.status === "rejected"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {latest.status}
                    </Badge>
                    <div className="text-muted-foreground">
                      Submitted {new Date(latest.created_at).toLocaleString()}
                    </div>
                    {latest.decided_at ? (
                      <div className="text-muted-foreground">
                        Decided {new Date(latest.decided_at).toLocaleString()}
                      </div>
                    ) : null}
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Admin note
                      </div>
                      <div className="mt-2 font-medium">
                        {latest.decision_note ||
                          "No admin note was attached to the latest decision."}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border bg-muted/20 p-3 text-muted-foreground">
                    No access request record was found for this account.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="h-5 w-5" /> Live support workflow
                </CardTitle>
                <CardDescription>
                  Key reminders for the production operator flow.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-lg border p-4">
                  Calls connect automatically when a pending escalation is
                  accepted. The manual join step is no longer part of the
                  operator workflow.
                </div>
                <div className="rounded-lg border p-4">
                  Agents work only from ticket aliases and should not rely on
                  private customer profile information.
                </div>
                <div className="rounded-lg border p-4">
                  If a call ends, continue the case in chat or request another
                  live session if the customer still needs synchronous support.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick actions</CardTitle>
                <CardDescription>
                  Shortcuts back into the active operator workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <Button asChild variant="outline" className="justify-between">
                  <Link href="/agent/queue?view=mine">
                    My tickets
                    <ClipboardList className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-between">
                  <Link href="/agent/queue?view=queue">
                    Open queue
                    <ClipboardList className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-between">
                  <Link href="/pricing">
                    Pricing reference
                    <MessageSquare className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-between">
                  <Link href="/settings">
                    General settings
                    <ShieldCheck className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
