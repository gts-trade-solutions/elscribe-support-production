"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getClientAppBaseUrl } from "@/lib/app-url";
import {
  Copy,
  Users,
  UserPlus,
  RefreshCcw,
  Building2,
  CreditCard,
  Check,
} from "lucide-react";

type AccountSummary = {
  accountId: string;
  type: "individual" | "company";
  ownerUserId: string;
  seatLimit: number;
  planCode: string | null;
  billingStatus: string;
};

type SubscriptionRow = {
  accountId: string;
  provider: string | null;
  planCode: string | null;
  seatLimitSnapshot: number;
  status: "inactive" | "active" | "past_due" | "canceled";
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
};

type FairUsageSnapshot = {
  applies: boolean;
  accountId: string;
  planCode: string | null;
  status: string | null;
  limit: number | null;
  used: number;
  remaining: number | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
};

type ContextResponse = {
  account: AccountSummary;
  activeMembers: number;
  subscription: SubscriptionRow | null;
  fairUsage?: FairUsageSnapshot | null;
  viewer: {
    userId: string;
    role: string;
    membershipRole: "owner" | "member" | null;
    isCompanyMemberElsewhere?: boolean;
  };
};

type MemberRow = {
  userId: string;
  email: string;
  membershipRole: "owner" | "member";
};

type InviteRow = {
  id: string;
  email: string;
  token: string;
  expiresAt: string;
  createdAt: string;
};

type CompanyPlan = {
  code: string;
  name: string;
  employees: string;
  seatLimit: number;
  fairUsageTicketLimit: number;
  priceLabel: string;
  priceMonthlyUsd: number;
};

type SubscriptionResponse = {
  account: AccountSummary;
  occupiedSeats: number;
  subscription: SubscriptionRow | null;
  latestPayment?: {
    status: string;
    planCode: string | null;
  } | null;
  fairUsage?: FairUsageSnapshot | null;
  plans: CompanyPlan[];
  displayCurrency: string;
  processorCurrency: string;
  canManage: boolean;
};

declare global {
  interface Window {
    Razorpay?: any;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function CompanyUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const didLoadRef = useRef(false);

  const sessionRole = (session?.user as any)?.role as string | undefined;

  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [ctx, setCtx] = useState<ContextResponse | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionResponse | null>(null);
  const [payingPlanCode, setPayingPlanCode] = useState<string | null>(null);

  const canManage =
    status === "authenticated" &&
    sessionRole === "customer" &&
    ctx?.account.type === "company" &&
    ctx.viewer.membershipRole === "owner";

  const isCompanyMember =
    status === "authenticated" &&
    sessionRole === "customer" &&
    ctx?.account.type === "company" &&
    ctx.viewer.membershipRole === "member";

  const isIndividualOwner =
    status === "authenticated" &&
    sessionRole === "customer" &&
    ctx?.account.type === "individual" &&
    ctx.viewer.membershipRole === "owner";

  const seatLabel = useMemo(() => {
    if (!ctx) return "";
    return `${ctx.activeMembers} / ${ctx.account.seatLimit} total seats used`;
  }, [ctx]);

  const currentPlanCode =
    subscriptionData?.subscription?.planCode || ctx?.account.planCode || null;
  const displayCurrency = subscriptionData?.displayCurrency || "USD";
  const processorCurrency = subscriptionData?.processorCurrency || "INR";
  const fairUsage = subscriptionData?.fairUsage || ctx?.fairUsage || null;
  const appBaseUrl = getClientAppBaseUrl();

  const loadRazorpay = async () => {
    if (typeof window === "undefined") return false;
    if (window.Razorpay) return true;

    return await new Promise<boolean>((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const loadContext = useCallback(async () => {
    const ctxRes = await fetch("/api/account/context", { cache: "no-store" });
    const ctxJson = await ctxRes.json();
    if (!ctxRes.ok) {
      throw new Error(ctxJson?.error ?? "Failed to load account context");
    }

    const typedCtx = ctxJson as ContextResponse;
    setCtx(typedCtx);

    if (typedCtx.account.type === "company") {
      const subRes = await fetch("/api/billing/subscription", {
        cache: "no-store",
      });
      const subJson = await subRes.json();
      if (!subRes.ok) {
        throw new Error(subJson?.error ?? "Failed to load billing details");
      }
      setSubscriptionData(subJson as SubscriptionResponse);
    } else {
      setSubscriptionData(null);
    }

    if (
      typedCtx.account.type === "company" &&
      typedCtx.viewer.membershipRole === "owner"
    ) {
      const [mRes, iRes] = await Promise.all([
        fetch("/api/account/members", { cache: "no-store" }),
        fetch("/api/account/invites", { cache: "no-store" }),
      ]);

      const mJson = await mRes.json();
      const iJson = await iRes.json();
      setMembers(mRes.ok ? (mJson.members ?? []) : []);
      setInvites(iRes.ok ? (iJson.invites ?? []) : []);
    } else {
      setMembers([]);
      setInvites([]);
    }
  }, []);

  const refresh = useCallback(
    async (showToast = false) => {
      if (status !== "authenticated") return;
      setLoading(true);
      try {
        await loadContext();
        if (showToast) toast.success("Company settings refreshed");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load company settings";
        toast.error(message);
      } finally {
        setLoading(false);
        setBootstrapping(false);
      }
    },
    [loadContext, status],
  );

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      setBootstrapping(false);
      return;
    }
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    refresh(false);
  }, [refresh, status]);

  const convertToCompany = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/convert-to-company", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error ?? "Failed to convert");
        return;
      }

      await refresh(false);
      toast.success("Converted to company account.");
    } catch {
      toast.error("Failed to convert");
    } finally {
      setLoading(false);
    }
  };

  const createInvite = async () => {
    setLoading(true);
    setLastInviteUrl(null);
    try {
      const res = await fetch("/api/account/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg =
          json?.error === "SEAT_LIMIT_REACHED"
            ? `Seat limit reached (${json.activeMembers}/${json.seatLimit}). Activate or upgrade the company plan to add more seats.`
            : (json?.error ?? "Failed to create invite");
        toast.error(msg);
        return;
      }
      setLastInviteUrl(json.inviteUrl);
      toast.success("Invite created. Copy the link and send it to the user.");
      setInviteEmail("");
      await refresh(false);
    } catch {
      toast.error("Failed to create invite");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const remove = async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/members/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error ?? "Failed to remove member");
        return;
      }
      toast.success("Member removed");
      await refresh(false);
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setLoading(false);
    }
  };

  const startPlanCheckout = async (plan: CompanyPlan) => {
    if (!canManage) return;
    setPayingPlanCode(plan.code);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Failed to load Razorpay checkout");

      const res = await fetch("/api/billing/subscription/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode: plan.code }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.message ?? data?.error ?? "Failed to create order",
        );
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "eLscribe",
        description: `${plan.name} • Company plan`,
        order_id: data.orderId,
        handler: async (resp: any) => {
          try {
            const vr = await fetch("/api/billing/subscription/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentId: data.paymentId,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_signature: resp.razorpay_signature,
              }),
            });
            const vj = await vr.json();
            if (!vr.ok) {
              throw new Error(
                vj?.message ?? vj?.error ?? "Verification failed",
              );
            }
            toast.success("Company plan activated.");
            await refresh(false);
          } catch (e: any) {
            toast.error(e?.message ?? "Subscription verification failed");
          }
        },
        modal: {
          ondismiss: () => setPayingPlanCode(null),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start plan checkout");
    } finally {
      setPayingPlanCode(null);
    }
  };

  if (status === "loading" || bootstrapping) {
    return (
      <AppLayout>
        <div className="container py-10">
          <Card className="mx-auto max-w-xl">
            <CardHeader>
              <CardTitle>Company users</CardTitle>
              <CardDescription>Loading your account context…</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (status === "unauthenticated") {
    return (
      <AppLayout>
        <div className="container py-10">
          <Card className="mx-auto max-w-xl">
            <CardHeader>
              <CardTitle>Company users</CardTitle>
              <CardDescription>Please sign in to continue.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/signin")}>Sign in</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Company users</h1>
              <p className="text-muted-foreground">
                Manage company memberships, paid seat limits, and plan
                activation.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => refresh(true)}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {ctx && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Account context
                </CardTitle>
                <CardDescription>
                  <span className="mr-2">{seatLabel}</span>
                  <Badge variant="secondary">{ctx.account.billingStatus}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-4">
                  <div>
                    Account type:{" "}
                    <span className="font-medium text-foreground">
                      {ctx.account.type}
                    </span>
                  </div>
                  <div>
                    Your role:{" "}
                    <span className="font-medium text-foreground">
                      {ctx.viewer.membershipRole ?? "—"}
                    </span>
                  </div>
                  <div>
                    Plan:{" "}
                    <span className="font-medium text-foreground">
                      {ctx.account.planCode ?? "custom"}
                    </span>
                  </div>
                  <div>
                    Billing:{" "}
                    <span className="font-medium text-foreground">
                      {ctx.account.billingStatus}
                    </span>
                  </div>
                </div>

                {isCompanyMember && (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                    You are already an active member of this company account.
                    Only company owners can manage seats, billing, and invite
                    links.
                  </div>
                )}

                {isIndividualOwner && !ctx.viewer.isCompanyMemberElsewhere && (
                  <div className="rounded-lg border p-4">
                    <div className="flex items-start gap-3">
                      <Building2 className="mt-0.5 h-5 w-5" />
                      <div className="flex-1">
                        <p className="font-medium">
                          Convert to a company account
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Converting enables company memberships and plan-based
                          seat entitlements. The default company state starts
                          with a single owner seat until a paid plan is
                          activated.
                        </p>
                      </div>
                      <Button onClick={convertToCompany} disabled={loading}>
                        Convert
                      </Button>
                    </div>
                  </div>
                )}

                {isIndividualOwner && ctx.viewer.isCompanyMemberElsewhere && (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                    You are already an active member of another company account.
                    Converting this individual account into a company account is
                    blocked while that membership is active.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {ctx?.account.type === "company" && subscriptionData && (
            <div className="grid gap-6 lg:grid-cols-[1.1fr,1.4fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Company plan billing
                  </CardTitle>
                  <CardDescription>
                    Product pricing stays in {displayCurrency}. Razorpay
                    checkout is temporarily running in {processorCurrency} for
                    testing.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="rounded-lg border p-4">
                    <div className="font-medium text-foreground">
                      {currentPlanCode || "No active plan"}
                    </div>
                    <div className="mt-1">
                      Status:{" "}
                      {subscriptionData.subscription?.status ||
                        ctx.account.billingStatus}
                    </div>
                    <div className="mt-1">
                      Period start:{" "}
                      {formatDate(
                        subscriptionData.subscription?.currentPeriodStart,
                      )}
                    </div>
                    <div className="mt-1">
                      Period end:{" "}
                      {formatDate(
                        subscriptionData.subscription?.currentPeriodEnd,
                      )}
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Seat limits now apply to the full company workspace,
                      including the owner seat.
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="font-medium text-foreground">
                      Ticket fair usage policy
                    </div>
                    {fairUsage?.applies && fairUsage.limit ? (
                      <>
                        <div className="mt-1">
                          Used this billing period: {fairUsage.used} /{" "}
                          {fairUsage.limit} tickets
                        </div>
                        <div className="mt-1">
                          Remaining this period: {fairUsage.remaining ?? 0}
                        </div>
                        <div className="mt-3 text-xs text-muted-foreground">
                          Paid company plans allow shared ticket creation across
                          the workspace, capped under a fair usage policy at 10×
                          the plan band seat maximum per billing cycle.
                        </div>
                      </>
                    ) : (
                      <div className="mt-1">
                        Fair usage tracking activates when this company
                        workspace has an active paid plan.
                      </div>
                    )}
                  </div>

                  {subscriptionData.latestPayment?.status === "pending" ? (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
                      There is a pending company plan payment in progress.
                      Complete the checkout or start a fresh plan order.
                    </div>
                  ) : null}

                  {canManage ? (
                    <div className="rounded-lg border p-4">
                      <div className="font-medium text-foreground">
                        Owner controls
                      </div>
                      <div className="mt-1">
                        Activate or change the company plan from the options on
                        the right. Downgrades are blocked when the selected plan
                        is smaller than your current occupied seat count.
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border p-4">
                      <div className="font-medium text-foreground">
                        Member view
                      </div>
                      <div className="mt-1">
                        Only company owners can activate or change the plan.
                        Your current access continues to follow the company
                        billing state.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Available company plans</CardTitle>
                  <CardDescription>
                    Flat monthly pricing by company size with paid seat
                    entitlements applied immediately after verification.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {subscriptionData.plans.map((plan) => {
                    const isCurrent =
                      plan.code === currentPlanCode &&
                      ctx?.account.billingStatus === "active";
                    const occupiedSeats = subscriptionData.occupiedSeats;
                    const tooSmall = occupiedSeats > plan.seatLimit;
                    return (
                      <div
                        key={plan.code}
                        className="rounded-xl border p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-foreground">
                              {plan.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {plan.employees}
                            </div>
                          </div>
                          {isCurrent ? <Badge>Current</Badge> : null}
                        </div>
                        <div className="text-2xl font-semibold text-foreground">
                          {plan.priceLabel}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Supports up to {plan.seatLimit} total seats.
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Fair usage: up to {plan.fairUsageTicketLimit} tickets
                          per billing cycle.
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-start gap-2">
                            <Check className="mt-0.5 h-4 w-4 text-primary" />
                            Ticket-first support workflow
                          </div>
                          <div className="flex items-start gap-2">
                            <Check className="mt-0.5 h-4 w-4 text-primary" />
                            Paid seat enforcement on company invites
                          </div>
                        </div>
                        {tooSmall ? (
                          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
                            This plan is smaller than your current occupied seat
                            count ({occupiedSeats}). Remove members or choose a
                            larger plan.
                          </div>
                        ) : null}
                        {canManage ? (
                          <Button
                            className="w-full"
                            variant={isCurrent ? "outline" : "default"}
                            disabled={tooSmall || payingPlanCode === plan.code}
                            onClick={() => startPlanCheckout(plan)}
                          >
                            {payingPlanCode === plan.code
                              ? "Opening checkout…"
                              : isCurrent
                                ? "Renew current plan"
                                : currentPlanCode
                                  ? "Change plan"
                                  : "Activate plan"}
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {canManage && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Invite teammate
                  </CardTitle>
                  <CardDescription>
                    Seat checks now apply to the entire company workspace,
                    including the owner seat.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="member@company.com"
                    />
                  </div>
                  <Button
                    onClick={createInvite}
                    disabled={loading || !inviteEmail.trim()}
                  >
                    Create invite
                  </Button>

                  {lastInviteUrl && (
                    <div className="rounded-lg border p-3 text-sm">
                      <div className="mb-2 font-medium">Latest invite link</div>
                      <div className="break-all text-muted-foreground">
                        {lastInviteUrl}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 gap-2"
                        onClick={() => copy(lastInviteUrl)}
                      >
                        <Copy className="h-4 w-4" />
                        Copy invite link
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Members</CardTitle>
                  <CardDescription>
                    Active users in this company workspace
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {members.length === 0 ? (
                    <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                      No active members yet.
                    </div>
                  ) : (
                    members.map((m) => (
                      <div
                        key={m.userId}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <div className="font-medium">{m.email}</div>
                          <div className="text-sm text-muted-foreground">
                            {m.membershipRole}
                          </div>
                        </div>
                        {m.membershipRole !== "owner" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => remove(m.userId)}
                            disabled={loading}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle>Pending invites</CardTitle>
                <CardDescription>
                  Shareable invite links waiting to be accepted.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {invites.length === 0 ? (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                    No pending invites.
                  </div>
                ) : (
                  invites.map((inv) => {
                    return (
                      <div
                        key={inv.id}
                        className="rounded-lg border p-4 text-sm text-muted-foreground"
                      >
                        <div className="font-medium text-foreground">
                          {inv.email}
                        </div>
                        <div>
                          Created {new Date(inv.createdAt).toLocaleString()}
                        </div>
                        <div>
                          Expires {new Date(inv.expiresAt).toLocaleString()}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              copy(
                                `${appBaseUrl}/invite/${encodeURIComponent(inv.token)}`,
                              )
                            }
                          >
                            Copy invite link
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
