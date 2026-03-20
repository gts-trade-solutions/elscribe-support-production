"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { AppLayout } from "@/app/app-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function InviteAcceptPage() {
  const params = useParams();
  const token = String((params as any).token ?? "");
  const router = useRouter();
  const { status, update } = useSession();
  const isAuthed = status === "authenticated";

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<"idle" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const acceptInvite = async () => {
    if (!token) {
      setResult("error");
      setError("Invalid invite link");
      return;
    }

    setLoading(true);
    setResult("idle");
    setError(null);

    try {
      const res = await fetch("/api/account/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();

      if (!res.ok) {
        setResult("error");
        setError(json?.error ?? "Failed to accept invite");
        return;
      }

      await update();
      setResult("ok");
      toast.success("Invite accepted. Your company membership is now active.");
      router.replace("/settings/company-users");
      router.refresh();
    } catch {
      setResult("error");
      setError("Failed to accept invite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container py-10">
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle>Accept invite</CardTitle>
            <CardDescription>
              Join a company account using your invite link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isAuthed ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Please sign in to accept this invite.
                </p>
                <Button
                  onClick={() =>
                    router.push(
                      `/signin?callbackUrl=/invite/${encodeURIComponent(token)}`,
                    )
                  }
                >
                  Sign in
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Accepting this invite will switch your active account context
                  to the company workspace.
                </p>

                {result === "error" && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                {result === "ok" && (
                  <p className="text-sm text-emerald-600">
                    Invite accepted. Redirecting…
                  </p>
                )}

                <div className="flex gap-2">
                  <Button onClick={acceptInvite} disabled={loading || !token}>
                    {loading ? "Accepting…" : "Accept invite"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/")}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
