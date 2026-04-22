"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { AppLayout } from "../app-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  CreditCard,
  Headset,
  MessageSquare,
  ShieldCheck,
  UserCog,
  Users,
  ArrowRight,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Lock,
  UserPlus,
} from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user as
    | {
        id?: string;
        email?: string | null;
        role?: string;
        accountId?: string;
        accountType?: string;
        membershipRole?: string;
        isGuest?: boolean;
      }
    | undefined;

  const role = user?.role || "customer";
  const isCustomer = role === "customer";
  const isAgent = role === "agent";
  const isAdmin = role === "admin";
  const isCompany = user?.accountType === "company";
  const isOwner = user?.membershipRole === "owner";
  const isGuest = Boolean(user?.isGuest);

  if (isGuest) {
    return (
      <AppLayout>
        <div className="container py-8">
          <div className="mx-auto max-w-2xl space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
              <p className="mt-2 text-muted-foreground">
                You&apos;re signed in with a temporary guest session. Most
                workspace settings require a full account.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lock className="h-5 w-5" />
                  Guest session
                </CardTitle>
                <CardDescription>
                  Create an account to unlock the full El Scribe workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-lg border p-4">
                  Create an account to access company users and seat
                  management.
                </div>
                <div className="rounded-lg border p-4">
                  Create an account to access agent-access requests.
                </div>
                <div className="rounded-lg border p-4">
                  Create an account to keep your ticket history beyond the
                  48-hour guest window.
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button asChild>
                    <Link href="/convert-account">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create account
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/tickets">Back to my ticket</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  const quickLinks = isAdmin
    ? [
        {
          title: "Admin dashboard",
          description:
            "Review operational counts and move directly into active admin work.",
          href: "/admin/dashboard",
          icon: LayoutDashboard,
          cta: "Open dashboard",
        },
        {
          title: "Agent requests",
          description:
            "Approve or reject internal access requests from one operational view.",
          href: "/admin/agent-requests",
          icon: UserCog,
          cta: "Review requests",
        },
        {
          title: "Ticket queue",
          description:
            "Inspect queue load, payment-blocked tickets, and active support work.",
          href: "/agent/queue?view=queue",
          icon: ClipboardList,
          cta: "Open queue",
        },
        {
          title: "Company users",
          description:
            "Check company seat-management and invite flows when needed.",
          href: "/settings/company-users",
          icon: Users,
          cta: "Open company access",
        },
      ]
    : isAgent
      ? [
          {
            title: "My tickets",
            description: "Go back to the tickets currently assigned to you.",
            href: "/agent/queue?view=mine",
            icon: ClipboardList,
            cta: "Open my tickets",
          },
          {
            title: "Queue",
            description: "Review unassigned tickets and pick up the next case.",
            href: "/agent/queue?view=queue",
            icon: Headset,
            cta: "Open queue",
          },
          {
            title: "Agent settings",
            description:
              "Review your operator access status, the latest approval note, and workspace reminders.",
            href: "/agent/settings",
            icon: Settings,
            cta: "Open settings",
          },
          {
            title: "Pricing reference",
            description:
              "Review the customer-facing incident pricing used in the support workflow.",
            href: "/pricing",
            icon: CreditCard,
            cta: "Open pricing",
          },
        ]
      : [
          {
            title: "Tickets",
            description:
              "Review current ticket history and jump back into active support.",
            href: "/tickets",
            icon: MessageSquare,
            cta: "Open tickets",
          },
          {
            title: "New support request",
            description:
              "Create a new ticket and continue directly into the support workspace.",
            href: "/tickets/new",
            icon: Headset,
            cta: "Create ticket",
          },
          {
            title: "Agent access",
            description:
              "Request internal agent access or review your current request status.",
            href: "/settings/agent-access",
            icon: UserCog,
            cta: "Manage request",
          },
          {
            title: "Pricing",
            description:
              "Compare incident pricing and company-coverage paths before you start support.",
            href: "/pricing",
            icon: CreditCard,
            cta: "Review pricing",
          },
        ];

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
              <p className="mt-2 text-muted-foreground">
                Review the current workspace context and jump directly into the
                routes that matter for your role.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{role}</Badge>
              <Badge variant="outline">
                {user?.accountType || "individual"}
              </Badge>
              <Badge variant="outline">{user?.membershipRole || "owner"}</Badge>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Workspace summary</CardTitle>
                <CardDescription>
                  Live session details for the current El Scribe access context.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                  <div className="mt-2 font-medium">{role}</div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Account type
                  </div>
                  <div className="mt-2 font-medium">
                    {user?.accountType || "individual"}
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Membership role
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
                  Operational rules
                </CardTitle>
                <CardDescription>
                  The shell and workflows should stay aligned to the currently
                  active product rules.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-lg border p-4">
                  Agents work from ticket aliases, not private profile fields.
                </div>
                <div className="rounded-lg border p-4">
                  Company owners can manage members; company members stay scoped
                  to their own tickets.
                </div>
                <div className="rounded-lg border p-4">
                  Incident billing is handled through the ticket-linked support
                  workspace.
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="flex flex-col">
                  <CardHeader>
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-muted/40">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <Button asChild variant="outline" className="w-full">
                      <Link href={item.href}>
                        {item.cta}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {isCustomer ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5" />
                    Company access
                  </CardTitle>
                  <CardDescription>
                    Company access controls should feel operational, not
                    informational.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="rounded-lg border p-4">
                    {isCompany
                      ? "This workspace is already a company account. Use Company users to manage seats and invitations."
                      : "This workspace is currently individual. Convert it to a company account if you need owner/member access and invite management."}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild>
                      <Link href="/settings/company-users">
                        Open company users
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/pricing">Review company plans</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-5 w-5" />
                    Recommended next step
                  </CardTitle>
                  <CardDescription>
                    Move directly into the action that matches your current
                    workspace role.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="rounded-lg border p-4">
                    {isOwner
                      ? "As an owner, you can manage company seats and invite flows."
                      : "As a member, focus on your own tickets and support sessions."}
                  </div>
                  <Button asChild className="w-full">
                    <Link
                      href={isOwner ? "/settings/company-users" : "/tickets"}
                    >
                      {isOwner ? "Manage company users" : "Go to my tickets"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Role context</CardTitle>
                <CardDescription>
                  This settings page is intentionally lightweight for
                  non-customer roles.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {isAdmin
                  ? "Admins should mainly work from the dashboard, agent requests, and queue views."
                  : "Agents should mainly work from My tickets, Queue, and the ticket workspace opened from queue."}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
