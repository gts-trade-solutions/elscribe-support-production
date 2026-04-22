"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { toast } from "sonner";

import { AppLayout } from "../app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, ShieldCheck, UserPlus } from "lucide-react";

export const dynamic = "force-dynamic";

const RETURN_TICKET_KEY = "__convert_return_ticket";
const WELCOME_FLAG_KEY = "__convert_welcome_pending";

export default function ConvertAccountPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user as
    | { email?: string | null; isGuest?: boolean }
    | undefined;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/signin");
      return;
    }
    if (!user?.isGuest) {
      router.replace("/settings");
    }
  }, [status, user?.isGuest, router]);

  // Stash a return path so the post-signIn step can bounce back to the
  // ticket the guest was on. Best-effort — falls back to /tickets.
  useEffect(() => {
    try {
      const ref = document.referrer;
      if (!ref) return;
      const url = new URL(ref);
      if (url.origin !== window.location.origin) return;
      const match = url.pathname.match(/^\/tickets\/([^/]+)/);
      if (match?.[1]) {
        sessionStorage.setItem(RETURN_TICKET_KEY, match[1]);
      }
    } catch {
      // ignore
    }
  }, []);

  const email = user?.email || "";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/account/convert-guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          json?.message || json?.error || "Failed to create account",
        );
      }

      // Flag the welcome toast before the session churn so the post-signIn
      // /tickets page can pick it up on mount.
      try {
        sessionStorage.setItem(WELCOME_FLAG_KEY, "1");
      } catch {
        // ignore
      }

      // End guest session, then sign in with the real creds. Skip the
      // default callback redirect so we can land on the originating ticket.
      await signOut({ redirect: false });

      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!signInRes || signInRes.error) {
        toast.error(
          "Account created. Please sign in manually — the auto sign-in step failed.",
        );
        window.location.assign("/signin");
        return;
      }

      let returnTicketId: string | null = null;
      try {
        returnTicketId = sessionStorage.getItem(RETURN_TICKET_KEY);
        if (returnTicketId) sessionStorage.removeItem(RETURN_TICKET_KEY);
      } catch {
        // ignore
      }

      const dest = returnTicketId ? `/tickets/${returnTicketId}` : "/tickets";
      window.location.assign(dest);
    } catch (err: any) {
      toast.error(err?.message || "Conversion failed");
      setSubmitting(false);
    }
  };

  if (status !== "authenticated" || !user?.isGuest) {
    return (
      <AppLayout>
        <div className="container py-12 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
        <div className="w-full max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Create a full eLscribe account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-sm">
              <p className="text-muted-foreground">
                Keep access to this ticket past your 48-hour window. Create
                more tickets under the same email. Add payment methods. Manage
                your support history.
              </p>

              <div className="rounded-lg border bg-muted/30 p-3 text-xs">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span className="text-muted-foreground">
                    Your ticket, messages, and payment history stay exactly
                    where they are — nothing moves.
                  </span>
                </div>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      readOnly
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This is the email we already have for you. If you need a
                    different one, contact support — we&apos;ll handle it
                    manually.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      minLength={8}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    At least 8 characters.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm"
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="pl-10"
                      minLength={8}
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Creating account…" : "Create account"}
                  </Button>
                  <Button asChild type="button" variant="outline">
                    <Link href="/tickets">Back to my ticket</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
