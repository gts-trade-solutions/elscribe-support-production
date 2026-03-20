"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppLayout } from "../../app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Latest = {
  id: string;
  status: "pending" | "approved" | "rejected";
  reason: string | null;
  created_at: string;
  decision_note: string | null;
  decided_at: string | null;
} | null;

export default function AgentAccessRequestPage() {
  const [reason, setReason] = useState("");
  const [latest, setLatest] = useState<Latest>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await fetch("/api/settings/agent-request");
    if (res.ok) {
      const data = await res.json();
      setLatest(data.latest ?? null);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/agent-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed");
        return;
      }
      toast.success("Request submitted");
      setReason("");
      await load();
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = latest?.status ? latest.status.toUpperCase() : null;

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <div>
            <h1 className="text-2xl font-bold">Request Agent Access</h1>
            <p className="text-muted-foreground text-sm">
              Agent access requires admin approval.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {statusLabel ? (
                <>
                  <div>
                    Latest request: <b>{statusLabel}</b>
                  </div>
                  <div className="text-muted-foreground">
                    Submitted: {new Date(latest!.created_at).toLocaleString()}
                  </div>
                  {latest?.decided_at ? (
                    <div className="text-muted-foreground">
                      Decided: {new Date(latest.decided_at).toLocaleString()}
                    </div>
                  ) : null}
                  {latest?.decision_note ? (
                    <div>
                      <b>Note:</b> {latest.decision_note}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="text-muted-foreground">No requests yet.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submit request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Button
                onClick={submit}
                disabled={loading || latest?.status === "pending"}
              >
                {latest?.status === "pending"
                  ? "Request Pending"
                  : "Submit Request"}
              </Button>
              {latest?.status === "pending" ? (
                <div className="text-xs text-muted-foreground">
                  You already have a pending request.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
