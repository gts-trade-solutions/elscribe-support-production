import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BillingState, CallReq, IncidentItem, Ticket } from "./support-types";
import {
  CreditCard,
  Headphones,
  ShieldCheck,
  UserCheck,
  Lock,
} from "lucide-react";
import { formatIncidentPrice } from "@/lib/billing/pricing";

export function SupportActionsPane({
  ticket,
  billing,
  incidentCatalog,
  currency,
  processorCurrency,
  savingIncident,
  paying,
  requestingCallType,
  callReq,
  onSaveIncidentType,
  onPayNow,
  onRequestCall,
  compact = false,
}: {
  ticket: Ticket;
  billing: BillingState | null;
  incidentCatalog: IncidentItem[];
  currency: string;
  processorCurrency: string;
  savingIncident: boolean;
  paying: boolean;
  requestingCallType: "voice" | "video" | null;
  callReq: CallReq | null;
  onSaveIncidentType: (code: string) => void;
  onPayNow: () => void;
  onRequestCall: (type: "voice" | "video") => void;
  compact?: boolean;
}) {
  const selectedIncident =
    billing?.incidentTypeSelected || ticket.incident_type_selected || "";
  const selectedIncidentItem = incidentCatalog.find(
    (it) => it.code === selectedIncident,
  );
  const hasAssignedAgent = Boolean(ticket.assigned_agent_id);
  const incidentLocked = Boolean(selectedIncident);

  const paymentCopy =
    billing?.billingOverrideState === "cleared"
      ? "Billing cleared by admin"
      : billing?.billingOverrideState === "blocked"
        ? "Billing blocked by admin"
        : billing?.coveredByPlan
          ? "Included in company plan"
          : billing?.isPaid
            ? "Paid"
            : billing?.quoteRequired
              ? "Quote pending"
              : billing?.paymentRequired
                ? selectedIncidentItem?.pricingModel === "quoted"
                  ? "Quoted amount pending payment"
                  : "Payment required"
                : billing?.latestPaymentStatus
                  ? `Latest: ${billing.latestPaymentStatus.replaceAll("_", " ")}`
                  : selectedIncident
                    ? "Awaiting billing review"
                    : "Select incident";

  const paymentBadgeVariant =
    billing?.billingOverrideState === "cleared" ||
    billing?.coveredByPlan ||
    billing?.isPaid
      ? "secondary"
      : billing?.billingOverrideState === "blocked" ||
          billing?.quoteRequired ||
          billing?.paymentRequired
        ? "destructive"
        : "outline";

  const payDisabled =
    Boolean(billing?.coveredByPlan) ||
    billing?.billingOverrideState === "cleared" ||
    billing?.billingOverrideState === "blocked" ||
    !selectedIncident ||
    !selectedIncidentItem ||
    paying ||
    savingIncident ||
    Boolean(billing?.isPaid) ||
    Boolean(billing?.quoteRequired) ||
    (selectedIncidentItem.pricingModel === "quoted" &&
      !billing?.quoteAvailable);

  const callDisabled =
    !selectedIncident ||
    !hasAssignedAgent ||
    Boolean(billing?.paymentRequired) ||
    Boolean(billing?.quoteRequired) ||
    billing?.billingOverrideState === "blocked" ||
    callReq?.status === "pending" ||
    callReq?.status === "accepted" ||
    Boolean(requestingCallType);

  const callHint = !selectedIncident
    ? "Select an incident type first."
    : !hasAssignedAgent
      ? "An agent must be assigned before voice or video support can be requested."
      : billing?.billingOverrideState === "blocked"
        ? "Billing is currently blocked by an admin review, so live support cannot start yet."
        : billing?.coveredByPlan
          ? "This ticket is covered by the active company plan. Voice and video support unlock once an agent is assigned."
          : billing?.quoteRequired
            ? "This incident is waiting for admin quote review before live escalation can begin."
            : billing?.paymentRequired
              ? "Complete payment to unlock voice/video support."
              : callReq?.status === "pending"
                ? "A live support request is already waiting for approval."
                : callReq?.status === "accepted"
                  ? "A live support session is already active."
                  : "Voice and video support are available.";

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader className={cn(compact ? "px-4 py-3" : "")}>
        <CardTitle className="text-lg">Ticket workflow</CardTitle>
        {!compact ? (
          <div className="text-xs text-muted-foreground">
            Choose the incident type once, then request live support after an
            agent has been assigned. Paid company plans cover all incident
            workflows without per-incident checkout.
          </div>
        ) : null}
      </CardHeader>

      <CardContent
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-y-auto",
          compact ? "space-y-4 px-4 pb-4 pt-0" : "space-y-5",
        )}
      >
        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <div className="font-medium">Current ticket state</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {ticket.status.replaceAll("_", " ")} •{" "}
                {ticket.category || "general"}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <UserCheck className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <div className="font-medium">Agent assignment</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {hasAssignedAgent
                  ? billing?.coveredByPlan
                    ? "An agent is assigned. This ticket is already covered by the active company plan."
                    : "An agent is assigned. Live escalation can be requested when billing is clear."
                  : "Waiting for an agent assignment before voice or video can be requested."}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium">Incident classification</div>

          {incidentLocked ? (
            <div className="mt-2 rounded-xl border bg-muted/20 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Lock className="h-4 w-4" />
                {selectedIncidentItem?.label ||
                  selectedIncident.replaceAll("_", " ")}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                This incident type is locked after the first selection so
                billing always stays aligned with the ticket workflow.
              </div>
            </div>
          ) : (
            <>
              <select
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedIncident}
                onChange={(e) => onSaveIncidentType(e.target.value)}
                disabled={savingIncident}
              >
                <option value="">Select incident type…</option>
                {incidentCatalog.map((it) => (
                  <option key={it.code} value={it.code}>
                    {it.label} (
                    {it.pricingModel === "quoted"
                      ? it.publicPriceLabel
                      : formatIncidentPrice(it as any)}
                    )
                  </option>
                ))}
              </select>

              {!compact ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  This selection becomes permanent after it is saved the first
                  time.
                </div>
              ) : null}
            </>
          )}
        </div>

        <div>
          <div className="text-sm font-medium">Billing</div>

          <div className="mt-2 space-y-3">
            <div className="flex items-center justify-between rounded-xl border px-3 py-3">
              <div>
                <div className="text-sm font-medium">Session billing state</div>
                <div className="text-xs text-muted-foreground">
                  Paid company plans include all incident workflows. Individual
                  tickets use upfront checkout, while server repair uses an
                  admin-issued quote before payment becomes available.
                </div>
              </div>
              <Badge variant={paymentBadgeVariant as any}>{paymentCopy}</Badge>
            </div>

            {billing?.billingOverrideState === "cleared" ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Billing for this ticket was cleared by an admin. No per-incident
                checkout is required.
                {billing.billingOverrideNote ? (
                  <div className="mt-2">
                    Note: {billing.billingOverrideNote}
                  </div>
                ) : null}
              </div>
            ) : billing?.billingOverrideState === "blocked" ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Billing is blocked by an admin review right now, so checkout and
                live escalation stay locked.
                {billing.billingOverrideNote ? (
                  <div className="mt-2">
                    Note: {billing.billingOverrideNote}
                  </div>
                ) : null}
              </div>
            ) : billing?.coveredByPlan ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                This ticket is included in the active company plan. No
                per-incident checkout or admin quote is required.
              </div>
            ) : !selectedIncident ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Select an incident type before starting billing.
              </div>
            ) : null}

            {!billing?.coveredByPlan &&
            selectedIncidentItem?.pricingModel === "quoted" &&
            billing?.quoteRequired ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                This incident requires an admin quote before online payment can
                begin.
              </div>
            ) : null}

            {!billing?.coveredByPlan && billing?.quoteAvailable ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                <div className="font-medium text-foreground">
                  Quote available: {billing.quoteCurrency || currency}{" "}
                  {((billing.quoteAmount || 0) / 100).toFixed(2)}
                </div>
                {billing.quoteNote ? (
                  <div className="mt-1">{billing.quoteNote}</div>
                ) : null}
              </div>
            ) : null}

            {!billing?.coveredByPlan && billing?.paymentRequired ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Complete payment now to unlock voice/video escalation for this
                ticket.
              </div>
            ) : null}

            {billing?.billingOverrideState === "cleared" ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Billing for this ticket was cleared by an admin. No per-incident
                checkout is required.
                {billing.billingOverrideNote ? (
                  <div className="mt-2">
                    Note: {billing.billingOverrideNote}
                  </div>
                ) : null}
              </div>
            ) : billing?.billingOverrideState === "blocked" ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Billing is blocked by an admin review right now, so checkout and
                live escalation stay locked.
                {billing.billingOverrideNote ? (
                  <div className="mt-2">
                    Note: {billing.billingOverrideNote}
                  </div>
                ) : null}
              </div>
            ) : billing?.coveredByPlan ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Your company plan covers this ticket, including live escalation
                for all incident types once an agent is assigned.
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Prices are shown in {currency}. Razorpay checkout is temporarily
                running in {processorCurrency} for testing.
              </div>
            )}

            {!billing?.isPaid &&
            !billing?.coveredByPlan &&
            selectedIncidentItem ? (
              <Button
                onClick={onPayNow}
                disabled={payDisabled}
                className="w-full gap-2"
              >
                <CreditCard className="h-4 w-4" />
                {paying
                  ? "Opening checkout…"
                  : billing?.quoteAvailable
                    ? `Pay quoted amount (${billing.quoteCurrency || currency} ${((billing.quoteAmount || 0) / 100).toFixed(2)})`
                    : `Pay now (${currency} ${((selectedIncidentItem.amount || 0) / 100).toFixed(2)})`}
              </Button>
            ) : null}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium">Live escalation</div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => onRequestCall("voice")}
              disabled={callDisabled}
            >
              {requestingCallType === "voice" ? "Requesting…" : "Request voice"}
            </Button>

            <Button
              variant="outline"
              onClick={() => onRequestCall("video")}
              disabled={callDisabled}
            >
              {requestingCallType === "video" ? "Requesting…" : "Request video"}
            </Button>
          </div>

          <div className="mt-2 text-xs text-muted-foreground">{callHint}</div>

          <div className="mt-3 rounded-xl border p-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <Headphones className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                {callReq ? (
                  <>
                    Latest escalation: <b>{callReq.type}</b> • {callReq.status}
                  </>
                ) : (
                  <>No live escalation requests yet.</>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
