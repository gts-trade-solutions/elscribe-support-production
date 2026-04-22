"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Copy, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  getIncidentCatalog,
  type IncidentType,
} from "@/lib/billing/pricing";
import { CopyableScriptBlock } from "./copyable-script-block";

type DialogStep =
  | "greeting"
  | "fill"
  | "confirm"
  | "success"
  | "existing_real_user";

type ApiSuccess = {
  status: "created";
  ticketId: string;
  linkId: string;
  linkUrl: string;
  expiresAt: string;
  isNewGuest: boolean;
  isReturningGuest: boolean;
  guestEmail: string;
};

type ApiExistingRealUser = {
  status: "existing_real_user";
  email: string;
};

type FormState = {
  email: string;
  subject: string;
  incidentCode: string;
  description: string;
  quoteDollars: string;
  quoteNote: string;
};

const EMPTY_FORM: FormState = {
  email: "",
  subject: "",
  incidentCode: "",
  description: "",
  quoteDollars: "",
  quoteNote: "",
};

const DEFAULT_GREETING = `Hi! Thanks for reaching out to eLscribe support.

Give me one minute — I'm getting your ticket set up right now. As soon as it's ready I'll send you a secure payment link. Once you pay, you'll land directly on your support page and we can get started on the fix.

Talk in a moment.`;

function buildHandoffScript(linkUrl: string, incidentLabel: string) {
  return `Your ticket is ready. Here's your secure payment link:

${linkUrl}

A few quick notes:
- The link is valid for 48 hours.
- After payment, you'll land directly on your support page — no sign-in needed.
- Once you're in, click "Continue support" (or the button on the Next best action panel) so we can start working on your ${incidentLabel}.

I'll be right here when you land on the page. Talk soon.`;
}

function formatIncidentLabel(item: IncidentType) {
  return `${item.label} — ${item.publicPriceLabel}`;
}

function formatCents(cents: number) {
  return `USD ${(cents / 100).toFixed(2)}`;
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function CreateMagicLinkDialog({
  triggerLabel = "Create ticket & send link",
  triggerVariant = "default",
  triggerSize = "default",
  className,
  viewerRole = "agent",
}: {
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary";
  triggerSize?: "sm" | "default" | "lg";
  className?: string;
  viewerRole?: "admin" | "agent";
}) {
  const incidents = useMemo(() => getIncidentCatalog(), []);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<DialogStep>("greeting");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ApiSuccess | null>(null);
  const [existingRealUserEmail, setExistingRealUserEmail] = useState<
    string | null
  >(null);

  const selectedIncident = useMemo(
    () => incidents.find((i) => i.code === form.incidentCode) ?? null,
    [incidents, form.incidentCode],
  );
  const isQuoted = selectedIncident?.pricingModel === "quoted";

  const reset = () => {
    setForm(EMPTY_FORM);
    setResult(null);
    setExistingRealUserEmail(null);
    setStep("greeting");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      // Preserve state briefly so the close animation doesn't flash a blank
      // form, then reset on the next tick.
      setTimeout(() => reset(), 150);
    }
  };

  const validateFill = (): string | null => {
    if (!isValidEmail(form.email)) return "Enter a valid customer email.";
    const subject = form.subject.trim();
    if (subject.length < 3 || subject.length > 255)
      return "Subject must be between 3 and 255 characters.";
    if (!selectedIncident) return "Select an incident type.";
    if (isQuoted) {
      const n = Number(form.quoteDollars);
      if (!Number.isFinite(n) || n <= 0)
        return "Enter a positive quote amount in USD.";
    }
    return null;
  };

  const goToConfirm = () => {
    const err = validateFill();
    if (err) {
      toast.error(err);
      return;
    }
    setStep("confirm");
  };

  const submit = async () => {
    setSubmitting(true);
    setExistingRealUserEmail(null);
    try {
      const payload: Record<string, unknown> = {
        email: form.email.trim(),
        subject: form.subject.trim(),
        incidentTypeSelected: form.incidentCode,
      };
      if (form.description.trim())
        payload.description = form.description.trim();
      if (isQuoted) {
        payload.quoteAmount = Math.round(Number(form.quoteDollars) * 100);
        payload.quoteCurrency = "USD";
        if (form.quoteNote.trim()) payload.quoteNote = form.quoteNote.trim();
      }

      const res = await fetch("/api/tickets/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json:
        | ApiSuccess
        | ApiExistingRealUser
        | { error: string; message?: string } = await res
        .json()
        .catch(() => ({ error: "PARSE_ERROR" }) as any);

      if (!res.ok) {
        const msg =
          (json as any)?.message ||
          (json as any)?.error ||
          "Failed to create link";
        toast.error(String(msg));
        return;
      }

      if ((json as any).status === "existing_real_user") {
        setExistingRealUserEmail((json as ApiExistingRealUser).email);
        setStep("existing_real_user");
        return;
      }

      const ok = json as ApiSuccess;
      setResult(ok);
      setStep("success");
      toast.success("Ticket created and link generated.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create link");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLinkUrl = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.linkUrl);
      toast.success("Link copied to clipboard.");
    } catch {
      toast.error("Copy failed — copy the text manually.");
    }
  };

  const incidentLabelForHandoff = selectedIncident?.label || "issue";

  const confirmationScript = useMemo(() => {
    const email = form.email.trim();
    const subject = form.subject.trim();
    const description = form.description.trim();
    const incidentLine = selectedIncident
      ? isQuoted
        ? `${selectedIncident.label} — Quoted`
        : formatIncidentLabel(selectedIncident)
      : "—";

    const sections: string[] = [];
    sections.push(
      "Quick check before I send the payment link — can you confirm the details below?",
    );

    const details: string[] = [];
    details.push(`Customer email: ${email}`);
    details.push(`Issue: ${subject}`);
    details.push(`Incident type: ${incidentLine}`);
    if (description) {
      details.push(`Details you shared: ${description}`);
    }
    if (isQuoted) {
      const cents = Math.round(Number(form.quoteDollars || 0) * 100);
      details.push(`Quote: ${formatCents(cents)}`);
      const note = form.quoteNote.trim();
      if (note) {
        details.push(`Quote note: ${note}`);
      }
    }
    sections.push(details.join("\n"));

    sections.push(
      "Let me know if anything needs a change. Once you're good with this, I'll send your secure payment link.",
    );

    return sections.join("\n\n");
  }, [
    form.email,
    form.subject,
    form.description,
    form.quoteDollars,
    form.quoteNote,
    selectedIncident,
    isQuoted,
  ]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size={triggerSize}
          className={className}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        {step === "greeting" ? (
          <>
            <DialogHeader>
              <DialogTitle>
                First, let the client know you&apos;re setting things up.
              </DialogTitle>
              <DialogDescription>
                Copy this message to your chat or SMS so the client knows a
                payment link is coming. Edit it before copying if you want.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <CopyableScriptBlock
                label="Greeting script"
                defaultValue={DEFAULT_GREETING}
                rows={8}
                copyToast="Greeting copied — paste it to the client."
              />
              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setStep("fill")}
                >
                  Skip — I&apos;ve already greeted them
                </Button>
                <Button onClick={() => setStep("fill")}>
                  Next — enter ticket details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </DialogFooter>
            </div>
          </>
        ) : null}

        {step === "fill" ? (
          <>
            <DialogHeader>
              <DialogTitle>Enter ticket details</DialogTitle>
              <DialogDescription>
                Fill in the customer&apos;s details. You&apos;ll review them on
                the next step before generating the payment link.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="magic-link-email">Customer email</Label>
                <Input
                  id="magic-link-email"
                  type="email"
                  autoComplete="off"
                  placeholder="customer@example.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="magic-link-subject">Subject</Label>
                <Input
                  id="magic-link-subject"
                  placeholder="Short description of the issue"
                  value={form.subject}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subject: e.target.value }))
                  }
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="magic-link-incident">Incident type</Label>
                <Select
                  value={form.incidentCode}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, incidentCode: v }))
                  }
                >
                  <SelectTrigger id="magic-link-incident">
                    <SelectValue placeholder="Select an incident" />
                  </SelectTrigger>
                  <SelectContent>
                    {incidents.map((i) => (
                      <SelectItem key={i.code} value={i.code}>
                        {formatIncidentLabel(i)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isQuoted ? (
                  <p className="text-xs text-muted-foreground">
                    This incident requires a manual quote. Enter the amount in
                    USD below.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="magic-link-description">
                  Description{" "}
                  <span className="text-xs text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="magic-link-description"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  maxLength={5000}
                />
              </div>

              {isQuoted ? (
                <div className="space-y-4 rounded-md border border-dashed p-4">
                  <div className="space-y-2">
                    <Label htmlFor="magic-link-quote">Quote amount (USD)</Label>
                    <Input
                      id="magic-link-quote"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="e.g. 149.00"
                      value={form.quoteDollars}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          quoteDollars: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="magic-link-quote-note">
                      Quote note{" "}
                      <span className="text-xs text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <Textarea
                      id="magic-link-quote-note"
                      rows={2}
                      value={form.quoteNote}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, quoteNote: e.target.value }))
                      }
                      maxLength={1000}
                    />
                  </div>
                </div>
              ) : null}

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("greeting")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={goToConfirm}>
                  Review details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </DialogFooter>
            </div>
          </>
        ) : null}

        {step === "confirm" ? (
          <>
            <DialogHeader>
              <DialogTitle>Confirm details before generating the link</DialogTitle>
              <DialogDescription>
                These details will appear on the customer&apos;s payment page.
                Read them back to the client before you generate the link.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-3 rounded-lg border p-4 text-sm">
                <ReviewRow label="Customer email" value={form.email.trim()} />
                <ReviewRow label="Subject" value={form.subject.trim()} />
                <ReviewRow
                  label="Incident type"
                  value={
                    selectedIncident
                      ? formatIncidentLabel(selectedIncident)
                      : "—"
                  }
                />
                {form.description.trim() ? (
                  <ReviewRow
                    label="Description"
                    value={form.description.trim()}
                    multiline
                  />
                ) : null}
                {isQuoted ? (
                  <>
                    <ReviewRow
                      label="Quote amount"
                      value={formatCents(
                        Math.round(Number(form.quoteDollars || 0) * 100),
                      )}
                    />
                    {form.quoteNote.trim() ? (
                      <ReviewRow
                        label="Quote note"
                        value={form.quoteNote.trim()}
                        multiline
                      />
                    ) : null}
                  </>
                ) : null}
              </div>

              <CopyableScriptBlock
                label="Confirmation message to send to the client"
                defaultValue={confirmationScript}
                rows={9}
                hint="Paste this in your chat with the customer. They can tweak any detail here, and we'll update the form when you come back."
                copyToast="Confirmation message copied — paste it to the client."
              />

              <Alert>
                <AlertTitle>
                  Send the message above and wait for the client to confirm
                  before you click Generate link.
                </AlertTitle>
                <AlertDescription>
                  Once you generate the link, the customer will see these exact
                  details on the payment page.
                </AlertDescription>
              </Alert>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("fill")}
                  disabled={submitting}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={submit} disabled={submitting}>
                  {submitting ? "Generating…" : "Generate link"}
                </Button>
              </DialogFooter>
            </div>
          </>
        ) : null}

        {step === "existing_real_user" ? (
          <>
            <DialogHeader>
              <DialogTitle>Existing account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTitle>Email already in use</AlertTitle>
                <AlertDescription>
                  {existingRealUserEmail} belongs to an existing eLscribe
                  account. Please ask the customer to sign in and create the
                  ticket themselves — we can&apos;t generate a payment link
                  for an existing account from here.
                </AlertDescription>
              </Alert>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" onClick={() => setStep("fill")}>
                  Back to form
                </Button>
                <Button onClick={() => handleOpenChange(false)}>Close</Button>
              </DialogFooter>
            </div>
          </>
        ) : null}

        {step === "success" && result ? (
          <>
            <DialogHeader>
              <DialogTitle>Ticket created</DialogTitle>
              <DialogDescription>
                Share the payment link with {result.guestEmail}. The link
                expires in 48 hours.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertTitle>Link is single-use-visible</AlertTitle>
                <AlertDescription>
                  This link is shown once. The server cannot reconstruct it
                  later — copy it now if you need it again.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="magic-link-url">Payment link (raw)</Label>
                <div className="flex gap-2">
                  <Input
                    id="magic-link-url"
                    readOnly
                    value={result.linkUrl}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copyLinkUrl}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </div>

              <CopyableScriptBlock
                label="Message for the client"
                defaultValue={buildHandoffScript(
                  result.linkUrl,
                  incidentLabelForHandoff,
                )}
                rows={10}
                hint="Edit the message above if you want, then paste it into the client's chat."
                copyToast="Handoff message copied — paste it to the client."
              />

              {result.isNewGuest ? (
                <Alert>
                  <AlertTitle>New guest account</AlertTitle>
                  <AlertDescription>
                    A temporary guest account was created for this customer.
                    They can convert it to a full account after paying.
                  </AlertDescription>
                </Alert>
              ) : null}
              {result.isReturningGuest ? (
                <Alert>
                  <AlertTitle>Returning guest</AlertTitle>
                  <AlertDescription>
                    This customer already has a guest account from a previous
                    ticket — all their tickets will share the same login.
                  </AlertDescription>
                </Alert>
              ) : null}

              <DialogFooter className="gap-2 sm:gap-2">
                {viewerRole === "admin" ? (
                  <Button asChild variant="outline">
                    <Link href={`/admin/tickets/${result.ticketId}`}>
                      Manage this link
                    </Link>
                  </Button>
                ) : null}
                <Button variant="outline" onClick={reset}>
                  Create another
                </Button>
                <Button onClick={() => handleOpenChange(false)}>Close</Button>
              </DialogFooter>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ReviewRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
      <div className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </div>
      <div
        className={`text-sm ${
          multiline ? "whitespace-pre-wrap" : "break-words"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export default CreateMagicLinkDialog;
