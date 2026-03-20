import Link from "next/link";
import { AppLayout } from "./app-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  Building2,
  CreditCard,
  Headset,
  MessageSquare,
  ShieldCheck,
  Video,
} from "lucide-react";

const features = [
  {
    title: "Ticket-first support workflow",
    description:
      "Every support journey starts with a ticket so chat, call requests, billing, and audit history stay attached to the same case.",
    icon: MessageSquare,
  },
  {
    title: "Realtime escalation",
    description:
      "Move from text chat to voice, video, and screen share without leaving the support session.",
    icon: Video,
  },
  {
    title: "Company seat control",
    description:
      "Owners can invite users and manage seat limits, while members stay scoped to the tickets they created.",
    icon: Building2,
  },
  {
    title: "Incident-aware billing",
    description:
      "Support pricing, payment gating, and incident selection are built directly into the support flow.",
    icon: CreditCard,
  },
  {
    title: "Alias-only agent experience",
    description:
      "Agents work from ticket aliases instead of exposed customer profile details in agent-facing views.",
    icon: ShieldCheck,
  },
  {
    title: "Built for support operations",
    description:
      "Queue, console, handoff, ticket chat, and live-session workflows are designed for day-to-day support execution.",
    icon: Headset,
  },
];

export default function LandingPage() {
  return (
    <AppLayout>
      <div className="flex flex-col">
        <section className="container py-20 md:py-28">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center rounded-full border px-4 py-1.5 text-sm text-muted-foreground">
              Ticket-first IT support workspace
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Human IT support that moves from handoff to resolution in one
              workflow.
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg text-muted-foreground sm:text-xl">
              eLscribe connects customer handoff, tickets, realtime chat,
              voice/video escalation, company access control, and incident-based
              billing in a single application.
            </p>

            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/tickets">
                <Button size="lg" className="w-full px-8 text-lg sm:w-auto">
                  Open tickets
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>

              <Link href="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full px-8 text-lg sm:w-auto"
                >
                  View pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t py-16">
          <div className="container">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <h2 className="text-3xl font-bold">
                Everything stays aligned to the real product flow
              </h2>
              <p className="mt-3 text-muted-foreground">
                The frontend now centers only the implemented support journey:
                tickets, queue, console, billing, and live escalation.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={feature.title}
                    className="border-border/60 shadow-sm"
                  >
                    <CardHeader>
                      <Icon className="mb-3 h-10 w-10 text-primary" />
                      <CardTitle>{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-6">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t py-16">
          <div className="container">
            <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
              <Card className="rounded-3xl border bg-muted/20">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    Pay per incident when you need human help
                  </CardTitle>
                  <CardDescription>
                    Public incident pricing is clear and simple, so customers
                    can understand support costs before escalation.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="rounded-lg border bg-background p-4">
                    Password reset, printer troubleshooting, software repair,
                    device configuration, tune-up, network support, malware
                    cleanup, and emergency help are all covered in the incident
                    pricing model.
                  </div>
                  <Link href="/pricing">
                    <Button variant="outline">See incident pricing</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border bg-muted/20">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    Flat monthly company redundancy plans
                  </CardTitle>
                  <CardDescription>
                    Company pricing is based on employee band, keeping seat
                    management and monthly support planning simple.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="rounded-lg border bg-background p-4">
                    Small Business, Growth, Operational Redundancy, and
                    Enterprise Lite plans cover 1–200 employees with fixed
                    monthly pricing.
                  </div>
                  <Link href="/signup">
                    <Button>Get started</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
