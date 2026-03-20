"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "../../app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CreditCard, ShieldCheck, Ticket } from "lucide-react";
import { toast } from "sonner";
import { formatIncidentPrice, getIncidentCatalog } from "@/lib/billing/pricing";

const incidentOptions = getIncidentCatalog();

export default function NewTicketClient({
  initialIncidentType,
}: {
  initialIncidentType: string;
}) {
  const router = useRouter();

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(
    incidentOptions[0]?.category || "general",
  );
  const [incidentTypeSelected, setIncidentTypeSelected] = useState<string>(
    incidentOptions[0]?.code || "",
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const match = incidentOptions.find(
      (item) => item.code === initialIncidentType,
    );
    if (!match) return;
    setIncidentTypeSelected(match.code);
    setCategory(match.category);
    setSubject((prev) => (prev.trim() ? prev : `${match.label} request`));
  }, [initialIncidentType]);

  const selectedIncident = useMemo(
    () =>
      incidentOptions.find((item) => item.code === incidentTypeSelected) ??
      incidentOptions[0],
    [incidentTypeSelected],
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          description: description || null,
          category: category || null,
          incidentTypeSelected,
        }),
      });

      const json = await res.json();
      if (!res.ok)
        throw new Error(
          json?.message || json?.error || "Failed to create ticket",
        );

      toast.success("Ticket created");
      router.push(`/support?ticketId=${json.ticketId}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create ticket");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Create a support ticket</h1>
              <p className="mt-2 text-muted-foreground">
                Choose the incident type first so pricing, billing, and the live
                support workflow stay aligned from the start.
              </p>
            </div>
            <Badge variant="outline" className="w-fit">
              You will continue into the support workspace after creation
            </Badge>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Ticket details</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-6" onSubmit={onSubmit}>
                  <div className="space-y-2">
                    <Label>Incident type</Label>
                    <Select
                      value={incidentTypeSelected}
                      onValueChange={(value) => {
                        const match = incidentOptions.find(
                          (item) => item.code === value,
                        );
                        setIncidentTypeSelected(value);
                        if (match) {
                          setCategory(match.category);
                          setSubject((prev) =>
                            prev.trim() ? prev : `${match.label} request`,
                          );
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select incident type" />
                      </SelectTrigger>
                      <SelectContent>
                        {incidentOptions.map((item) => (
                          <SelectItem key={item.code} value={item.code}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {selectedIncident?.helper}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief summary of the issue"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={category}
                        onValueChange={(v: any) => setCategory(v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="account">Account</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                      <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Priority is set internally
                      </div>
                      Agents and admins assign the operational priority after
                      reviewing the ticket details and business impact.
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what happened, what changed, and what outcome you need from support"
                      rows={8}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" disabled={saving}>
                      {saving ? "Creating…" : "Create ticket and continue"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving}
                      onClick={() => router.push("/tickets")}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="h-5 w-5" />
                    Pricing preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="rounded-lg border p-4">
                    <div className="font-medium text-foreground">
                      {selectedIncident?.label}
                    </div>
                    <div className="mt-1">
                      {selectedIncident?.pricingModel === "quoted"
                        ? "This incident requires technician review before pricing is confirmed."
                        : `Public price: ${formatIncidentPrice(selectedIncident!)}`}
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    Fixed-price incidents use upfront USD billing before live
                    voice/video support can be unlocked.
                  </div>
                  <div className="rounded-lg border p-4">
                    Server repair uses a quoted path and stays under technician
                    review until pricing is confirmed manually.
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Ticket className="h-5 w-5" />
                    What happens next
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="rounded-lg border p-4">
                    1. Create the ticket with the correct incident type.
                  </div>
                  <div className="rounded-lg border p-4">
                    2. Continue into the support workspace for chat and billing.
                  </div>
                  <div className="rounded-lg border p-4">
                    3. Priority is assigned internally by the support team after
                    review.
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-start gap-3">
                      <CreditCard className="mt-0.5 h-4 w-4 text-primary" />
                      <span>
                        The incident type selected here becomes the starting
                        point for billing and live-support eligibility.
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
