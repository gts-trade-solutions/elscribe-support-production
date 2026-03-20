"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AppLayout } from "../../app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, UserCog } from "lucide-react";

type Item = {
  id: string;
  user_id: string;
  account_id: string | null;
  status: "pending" | "approved" | "rejected";
  reason: string | null;
  created_at: string;
};

export default function AdminAgentRequestsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteById, setNoteById] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/agent-requests");
      if (res.status === 401 || res.status === 403) {
        toast.error("Not allowed");
        router.push("/");
        return;
      }
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (id: string, decision: "approved" | "rejected") => {
    try {
      const res = await fetch(`/api/admin/agent-requests/${id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: noteById[id] || "" }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed");
        return;
      }

      toast.success(decision === "approved" ? "Approved" : "Rejected");
      await load();
    } catch {
      toast.error("Failed");
    }
  };

  return (
    <AppLayout>
      <div className="container space-y-6 py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Agent access requests</h1>
            <p className="mt-2 text-muted-foreground">
              Review pending internal-access requests and make a decision
              without leaving the admin workflow.
            </p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">
                Pending requests
              </div>
              <div className="mt-1 text-3xl font-semibold">{items.length}</div>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardContent className="flex h-full items-center gap-3 p-6 text-sm text-muted-foreground">
              <UserCog className="h-5 w-5 text-primary" />
              Approved users need to sign out and sign in again before the new
              role is reflected in their session.
            </CardContent>
          </Card>
        </div>

        {items.length === 0 && !loading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No pending requests right now.
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-4">
          {items.map((it) => (
            <Card key={it.id}>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Request #{it.id.slice(0, 8)}
                    </CardTitle>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary">pending</Badge>
                      <span>
                        Created {new Date(it.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground lg:text-right">
                    <div>User: {it.user_id}</div>
                    <div>Account: {it.account_id ?? "-"}</div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 text-sm">
                <div className="rounded-lg border p-4">
                  <div className="font-medium">Reason</div>
                  <div className="mt-2 text-muted-foreground">
                    {it.reason ?? "No reason provided."}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-medium">Decision note</div>
                  <Textarea
                    placeholder="Add an optional note for the approval or rejection decision"
                    value={noteById[it.id] ?? ""}
                    onChange={(e) =>
                      setNoteById((p) => ({ ...p, [it.id]: e.target.value }))
                    }
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => decide(it.id, "approved")}>
                    Approve request
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => decide(it.id, "rejected")}
                  >
                    Reject request
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
