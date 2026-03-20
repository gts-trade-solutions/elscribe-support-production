import Link from "next/link";
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
  ArrowRight,
  Check,
  ShieldCheck,
  Building2,
  Ticket,
} from "lucide-react";
import {
  formatIncidentPrice,
  getCompanyPlanCatalog,
  getIncidentCatalog,
} from "@/lib/billing/pricing";

const includedItems = [
  "Ticket-based support history",
  "Realtime chat in support sessions",
  "Voice/video escalation after billing clears",
  "Paid company plans include all incident types without per-ticket checkout",
  "Company seat and invite model",
  "Alias-safe agent handling",
  "Clear public incident pricing",
];

export default function PricingPage() {
  const incidentPricing = getIncidentCatalog();
  const companyPlans = getCompanyPlanCatalog();

  return (
    <AppLayout>
      <div className="container py-12">
        <div className="mx-auto max-w-7xl space-y-16">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              Transparent support pricing
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Clear incident pricing for every support path
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Start with a single incident or choose a monthly redundancy plan.
              Every path still leads into the same ticket-first eLscribe support
              workflow.
            </p>
          </div>

          <section className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-3xl font-bold">
                  Per-incident human support
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Fixed-price incidents use upfront USD billing. Server repair
                  is quoted after technician review.
                </p>
              </div>
              <Badge variant="outline">USD only</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {incidentPricing.map((item) => {
                const href = `/tickets/new?incidentType=${encodeURIComponent(item.code)}`;
                return (
                  <Card key={item.code} className="border-border/60">
                    <CardHeader className="pb-3">
                      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-muted/40">
                        <Ticket className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-lg">{item.label}</CardTitle>
                      <CardDescription>{item.helper}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-3xl font-bold">
                          {formatIncidentPrice(item)}
                        </span>
                        <Badge
                          variant={
                            item.pricingModel === "quoted"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {item.pricingModel === "quoted"
                            ? "Quoted"
                            : "Incident"}
                        </Badge>
                      </div>

                      <Link href={href}>
                        <Button className="w-full">
                          Start this incident
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-3xl font-bold">
                  Monthly MSP redundancy plans
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Flat monthly pricing by company size. Paid company plans
                  include all incident types without per-ticket checkout, while
                  still enforcing seat entitlements and fair-usage ticket
                  allowances.
                </p>
              </div>
              <Badge variant="outline">Company coverage</Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {companyPlans.map((plan) => (
                <Card key={plan.code} className="flex flex-col">
                  <CardHeader>
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-muted/40">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.employees}</CardDescription>
                    <div className="pt-3 text-4xl font-bold">
                      {plan.priceLabel}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    {[
                      "Flat monthly company pricing",
                      `Supports up to ${plan.seatLimit} seats in the paid band`,
                      `Fair usage up to ${plan.fairUsageTicketLimit} tickets per billing cycle`,
                      "Company owner seat control",
                      "All incident types included without per-ticket checkout",
                      "Ticket-first support workflow",
                    ].map((feature) => (
                      <div
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </div>
                    ))}

                    <Link href="/settings/company-users" className="block pt-2">
                      <Button variant="outline" className="w-full">
                        Prepare company access
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border bg-muted/20 p-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <h3 className="text-2xl font-bold">What every plan supports</h3>
                <p className="mt-3 text-muted-foreground">
                  Whether support starts as a single incident or a company plan,
                  the product still routes through the same ticket-first support
                  flow.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {includedItems.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-xl border bg-background p-4 text-sm"
                  >
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/tickets/new">
                <Button size="lg">
                  Start with a new ticket
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/settings/company-users">
                <Button size="lg" variant="outline">
                  Manage company access
                </Button>
              </Link>
            </div>
          </section>

          <div className="text-center text-sm text-muted-foreground">
            Incident and company plan pricing are modeled in USD across the
            product. Razorpay checkout is temporarily running in INR only for
            testing the payment processor path.
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
