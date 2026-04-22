"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AppLayout } from "../../app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  LogIn,
  ShieldAlert,
} from "lucide-react";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

type PricingModel = "fixed" | "quoted";

type ConsumeTicket = {
  id: string;
  subject: string;
  description: string | null;
  category: string | null;
  incidentTypeSelected: string | null;
  resolutionIncidentType: string | null;
  agentAlias: string;
};

type ConsumeBilling = {
  incidentLabel: string | null;
  publicPriceLabel: string | null;
  pricingModel: PricingModel | null;
  displayAmount: number | null;
  displayCurrency: string;
  quoteAmount: number | null;
  quoteCurrency: string | null;
  quoteNote: string | null;
  isPaid: boolean;
  paymentRequired: boolean;
  quoteRequired: boolean;
  quoteAvailable: boolean;
  coveredByPlan: boolean;
  coveredPlanCode: string | null;
  billingOverrideState: "cleared" | "blocked" | null;
  billingOverrideNote: string | null;
};

type ConsumeSuccess = {
  ok: true;
  ticket: ConsumeTicket;
  billing: ConsumeBilling;
  session: {
    guestUserId: string;
    guestEmail: string;
    sessionExpiresAt: string;
  };
  link: {
    linkId: string;
    linkExpiresAt: string;
  };
};

type ConsumeErrorCode =
  | "invalid"
  | "not_found"
  | "revoked"
  | "expired"
  | "existing_real_user"
  | "already_converted"
  | "server_error";

type ConsumeError = {
  ok: false;
  code: ConsumeErrorCode;
  message: string;
  email?: string;
  redirectTo?: string;
};

type ConsumeResponse = ConsumeSuccess | ConsumeError;

function formatAmount(amountMinor: number | null, currency: string) {
  if (amountMinor == null) return null;
  const dollars = amountMinor / 100;
  return `${currency} ${dollars.toFixed(2)}`;
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "0m";
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout>
      <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
        <div className="w-full max-w-xl">{children}</div>
      </div>
    </AppLayout>
  );
}

async function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.Razorpay) return true;
  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function TicketLinkClient({ token }: { token: string }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [consume, setConsume] = useState<ConsumeResponse | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());

  // The consume call is side-effecting (records a visit, writes an audit
  // log, and returns session metadata) so we gate it behind a ref to avoid
  // double-fires in React 18 strict mode dev.
  const consumeStartedRef = useRef(false);

  useEffect(() => {
    if (consumeStartedRef.current) return;
    consumeStartedRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/ticket-link/consume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const json = (await res.json().catch(() => null)) as
          | ConsumeResponse
          | null;

        if (!json) {
          setConsume({
            ok: false,
            code: "server_error",
            message: "We couldn't read the server response.",
          });
          return;
        }

        setConsume(json);

        if (json.ok) {
          // Establish the guest session cookie. We call signIn *after*
          // consume so that the token has been validated server-side once
          // before any session is minted. signIn runs validation a second
          // time inside the authorize() function.
          const signInResult = await signIn("guest-magic-link", {
            magicLinkToken: token,
            redirect: false,
          });
          if (signInResult?.ok) {
            setSessionReady(true);
          } else {
            toast.error(
              "We couldn't start your guest session. Please reload the page.",
            );
          }
        }
      } catch (e: any) {
        setConsume({
          ok: false,
          code: "server_error",
          message: e?.message || "Unexpected error.",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Live countdown for the link expiry banner.
  useEffect(() => {
    if (!consume?.ok) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [consume]);

  const linkExpiresAtMs = useMemo(() => {
    if (!consume?.ok) return null;
    return new Date(consume.link.linkExpiresAt).getTime();
  }, [consume]);

  const remainingMs = useMemo(() => {
    if (linkExpiresAtMs == null) return null;
    return linkExpiresAtMs - now;
  }, [linkExpiresAtMs, now]);

  const goToTicket = useCallback(() => {
    if (!consume?.ok) return;
    router.replace(`/tickets/${consume.ticket.id}`);
  }, [consume, router]);

  const handlePay = useCallback(async () => {
    if (!consume?.ok || !sessionReady) return;
    const ticketId = consume.ticket.id;

    setPaying(true);
    try {
      const razorpayReady = await loadRazorpay();
      if (!razorpayReady) {
        throw new Error("Failed to load Razorpay checkout.");
      }

      const orderRes = await fetch("/api/billing/incident/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });
      const orderJson = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok) {
        throw new Error(
          orderJson?.message || orderJson?.error || "Failed to create order.",
        );
      }

      const options = {
        key: orderJson.keyId,
        amount: orderJson.amount,
        currency: orderJson.currency,
        name: "El Scribe",
        description: `${
          orderJson?.incident?.label || "Support"
        } • Ticket ${String(ticketId).slice(0, 8)}`,
        order_id: orderJson.orderId,
        prefill: {
          email: consume.session.guestEmail,
        },
        handler: async (resp: any) => {
          try {
            const verifyRes = await fetch("/api/billing/incident/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ticketId,
                paymentId: orderJson.paymentId,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_signature: resp.razorpay_signature,
              }),
            });
            const verifyJson = await verifyRes.json().catch(() => ({}));
            if (!verifyRes.ok) {
              throw new Error(
                verifyJson?.message ||
                  verifyJson?.error ||
                  "Payment verification failed.",
              );
            }
            try {
              sessionStorage.setItem("__guest_postpay_hint", "1");
              sessionStorage.setItem("__guest_postpay_active", "1");
            } catch {
              // ignore
            }
            toast.success("Payment successful. Opening your support session…");
            router.replace(`/tickets/${ticketId}`);
          } catch (e: any) {
            toast.error(e?.message || "Payment verification failed.");
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
          },
        },
        notes: {
          ticketId,
          source: "magic_link",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e: any) {
      toast.error(e?.message || "Payment failed.");
      setPaying(false);
    }
  }, [consume, sessionReady, router]);

  // --- Render states -------------------------------------------------------

  if (loading) {
    return (
      <CenteredCard>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Opening your ticket link…
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Verifying the link. This only takes a moment.
          </CardContent>
        </Card>
      </CenteredCard>
    );
  }

  if (!consume) {
    return (
      <CenteredCard>
        <Card>
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Please try opening the link again.
          </CardContent>
        </Card>
      </CenteredCard>
    );
  }

  if (!consume.ok) {
    if (consume.code === "existing_real_user") {
      const signInHref =
        consume.redirectTo ||
        `/signin?callbackUrl=${encodeURIComponent("/tickets")}`;
      return (
        <CenteredCard>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                Sign in to continue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                This ticket is linked to the account{" "}
                <span className="font-medium">{consume.email}</span>. Please
                sign in to continue — we&apos;ll take you straight to the
                ticket.
              </p>
              <Button asChild>
                <Link href={signInHref}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in
                </Link>
              </Button>
            </CardContent>
          </Card>
        </CenteredCard>
      );
    }

    if (consume.code === "revoked") {
      return (
        <CenteredCard>
          <Card>
            <CardHeader>
              <CardTitle>Link revoked</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                This link has been revoked by an administrator. Contact your
                agent for a new link.
              </p>
            </CardContent>
          </Card>
        </CenteredCard>
      );
    }

    if (consume.code === "expired") {
      return (
        <CenteredCard>
          <Card>
            <CardHeader>
              <CardTitle>Link expired</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                This link has expired. Contact your agent or admin to request
                access.
              </p>
            </CardContent>
          </Card>
        </CenteredCard>
      );
    }

    if (consume.code === "already_converted") {
      return (
        <CenteredCard>
          <Card>
            <CardHeader>
              <CardTitle>Ticket already claimed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                This ticket has already been claimed by a user account. Please
                sign in to continue.
              </p>
              <Button asChild>
                <Link href="/signin">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in
                </Link>
              </Button>
            </CardContent>
          </Card>
        </CenteredCard>
      );
    }

    return (
      <CenteredCard>
        <Card>
          <CardHeader>
            <CardTitle>Invalid link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{consume.message || "This link is invalid."}</p>
            <p>Please check the URL or contact your agent.</p>
          </CardContent>
        </Card>
      </CenteredCard>
    );
  }

  const { ticket, billing, link } = consume;

  if (billing.isPaid) {
    return (
      <CenteredCard>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              This ticket is already paid
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Continue to your support session — your agent is ready when you
              are.
            </p>
            <Button onClick={goToTicket} disabled={!sessionReady}>
              Go to ticket
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </CenteredCard>
    );
  }

  if (billing.billingOverrideState === "blocked") {
    return (
      <CenteredCard>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Ticket under admin review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              This ticket is under admin review and online payment is not
              available right now. Your agent will contact you.
            </p>
          </CardContent>
        </Card>
      </CenteredCard>
    );
  }

  if (billing.quoteRequired) {
    return (
      <CenteredCard>
        <Card>
          <CardHeader>
            <CardTitle>Waiting on a quote</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              This incident is waiting for a technician review before a price
              can be confirmed. Your agent will share a quote with you soon.
            </p>
          </CardContent>
        </Card>
      </CenteredCard>
    );
  }

  // Main paywall state.
  const countdownText =
    remainingMs != null && remainingMs > 0
      ? formatCountdown(remainingMs)
      : "0m";
  const displayAmountText =
    formatAmount(billing.displayAmount, billing.displayCurrency) ||
    billing.publicPriceLabel ||
    "—";

  return (
    <CenteredCard>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Complete payment to start support</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Ticket created by your agent, ready when you are.
              </p>
            </div>
            <Badge variant="outline" className="shrink-0">
              Guest link
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertTitle>
              This link expires in {countdownText}
            </AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground">
              Your guest session will also last 48 hours after you pay. Create
              an account later to keep longer access.
            </AlertDescription>
          </Alert>

          <div className="rounded-lg border p-4">
            <div className="text-xs uppercase text-muted-foreground">
              Ticket
            </div>
            <div className="mt-1 text-base font-medium">{ticket.subject}</div>
            {ticket.description ? (
              <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {ticket.description}
              </div>
            ) : null}
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Agent:</span>
              <span className="font-mono">{ticket.agentAlias}</span>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase text-muted-foreground">
                  Incident
                </div>
                <div className="mt-1 text-base font-medium">
                  {billing.incidentLabel || ticket.incidentTypeSelected || "—"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase text-muted-foreground">
                  Amount
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {displayAmountText}
                </div>
              </div>
            </div>
            {billing.pricingModel === "quoted" && billing.quoteNote ? (
              <div className="mt-3 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                <div className="mb-1 font-medium text-foreground">
                  Quote note
                </div>
                {billing.quoteNote}
              </div>
            ) : null}
          </div>

          {!sessionReady ? (
            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Preparing secure session…</AlertTitle>
              <AlertDescription className="text-xs">
                Establishing your guest session. The pay button will enable in
                a moment.
              </AlertDescription>
            </Alert>
          ) : null}

          <Button
            className="w-full"
            size="lg"
            onClick={handlePay}
            disabled={!sessionReady || paying}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {paying ? "Opening checkout…" : `Pay ${displayAmountText}`}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Link id:{" "}
            <span className="font-mono">{link.linkId.slice(0, 8)}…</span>
          </p>
        </CardContent>
      </Card>
    </CenteredCard>
  );
}
