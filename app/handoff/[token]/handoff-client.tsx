"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function HandoffClient({
  token,
  ticketId,
  prefillEmail,
}: {
  token: string;
  ticketId: string;
  prefillEmail: string | null;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  const callbackUrl = useMemo(
    () => `/handoff/${encodeURIComponent(token)}`,
    [token],
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!ticketId) {
          if (mounted) setChecking(false);
          return;
        }

        const session = await getSession();
        if (!session) {
          if (prefillEmail) {
            // Avoid putting email in URL; keep it client-side only
            sessionStorage.setItem(
              "elscribe_prefill_signup",
              JSON.stringify({ email: prefillEmail }),
            );
          }
          if (mounted) {
            setAuthed(false);
            setChecking(false);
          }
          return;
        }

        setAuthed(true);

        const res = await fetch("/api/handoff/consume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          toast.error(j?.error || "Unable to complete handoff");
          if (mounted) setChecking(false);
          return;
        }

        // Success → go to Support Session
        router.replace(`/support?ticketId=${encodeURIComponent(ticketId)}`);
      } catch (e: any) {
        toast.error(e?.message || "Unable to complete handoff");
      } finally {
        if (mounted) setChecking(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token, ticketId, prefillEmail, router]);

  if (!ticketId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid or expired link</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Please request a new handoff link from El Scribe.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Opening your support session…</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Please wait.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Continue to support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sign in or create an account to access your support session.
            </p>
            <div className="flex gap-3">
              <Button asChild className="flex-1">
                <Link
                  href={`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                >
                  Sign in
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link
                  href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                >
                  Sign up
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If authed but consume failed, user stays here with toast.
  return null;
}
