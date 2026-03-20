import { query } from "@/lib/db";
import {
  getLatestTicketPayment,
  hasSucceededIncidentPayment,
} from "@/lib/billing/billing-repo";
import { getIncidentByCode } from "@/lib/billing/pricing";
import { getTicketQuote } from "@/lib/billing/quote-repo";
import { getAccountPlanCoverage } from "@/lib/billing/subscription-repo";
import { getTicketBillingOverride } from "@/lib/billing/override-repo";

export type TicketBillingState = {
  ticketId: string;
  accountId: string;
  incidentTypeSelected: string | null;
  resolutionIncidentType: string | null;
  isPaid: boolean;
  latestPaymentStatus: string | null;
  paymentRequired: boolean;
  quoteRequired: boolean;
  quoteAvailable: boolean;
  quoteAmount: number | null;
  quoteCurrency: string | null;
  quoteNote: string | null;
  quoteUpdatedAt: string | null;
  coveredByPlan: boolean;
  coveredPlanCode: string | null;
  billingOverrideState: "cleared" | "blocked" | null;
  billingOverrideNote: string | null;
  unlockedForCalls: boolean;
};

export async function getTicketBillingState(ticketId: string) {
  const rows: any[] = await query(
    `SELECT id, account_id, incident_type_selected, resolution_incident_type
       FROM tickets
      WHERE id = ?
      LIMIT 1`,
    [ticketId],
  );
  if (!rows[0]) return null;

  const accountId = String(rows[0].account_id);
  const incidentTypeSelected = rows[0].incident_type_selected
    ? String(rows[0].incident_type_selected)
    : null;
  const incident = getIncidentByCode(incidentTypeSelected);

  const planCoverage = await getAccountPlanCoverage(accountId);
  const coveredByPlan = Boolean(planCoverage?.coveredByPlan);
  const coveredPlanCode = planCoverage?.planCode ?? null;

  const isPaid = await hasSucceededIncidentPayment(ticketId);
  const latest = await getLatestTicketPayment(ticketId);
  const billingOverride = await getTicketBillingOverride(ticketId);
  const quote =
    incident?.pricingModel === "quoted" && !coveredByPlan
      ? await getTicketQuote(ticketId)
      : null;

  const overrideState = billingOverride?.state ?? null;
  const overrideCleared = overrideState === "cleared";
  const overrideBlocked = overrideState === "blocked";

  const quoteRequired = Boolean(
    !coveredByPlan &&
    !overrideCleared &&
    incident?.pricingModel === "quoted" &&
    !quote,
  );
  const quoteAvailable = Boolean(
    !coveredByPlan &&
    !overrideCleared &&
    incident?.pricingModel === "quoted" &&
    quote &&
    !isPaid,
  );
  const paymentRequired = Boolean(
    overrideBlocked ||
    (!coveredByPlan &&
      !overrideCleared &&
      incident &&
      !isPaid &&
      (incident.pricingModel === "fixed" ||
        (incident.pricingModel === "quoted" && quote))),
  );
  const unlockedForCalls = Boolean(
    incident &&
    !overrideBlocked &&
    (overrideCleared || isPaid || coveredByPlan),
  );

  return {
    ticketId,
    accountId,
    incidentTypeSelected,
    resolutionIncidentType: rows[0].resolution_incident_type
      ? String(rows[0].resolution_incident_type)
      : null,
    isPaid,
    latestPaymentStatus:
      overrideState === "cleared"
        ? "admin_cleared"
        : overrideState === "blocked"
          ? "admin_blocked"
          : (latest?.status ?? null),
    paymentRequired,
    quoteRequired,
    quoteAvailable,
    quoteAmount: quote?.amount ?? null,
    quoteCurrency: quote?.currency ?? null,
    quoteNote: quote?.note ?? null,
    quoteUpdatedAt: quote?.updatedAt ?? null,
    coveredByPlan,
    coveredPlanCode,
    billingOverrideState: overrideState,
    billingOverrideNote: billingOverride?.note ?? null,
    unlockedForCalls,
  } satisfies TicketBillingState;
}

export async function ensureTicketUnlockedForAgentAction(ticketId: string) {
  const state = await getTicketBillingState(ticketId);
  if (!state) return { ok: false as const, error: "NOT_FOUND" as const };
  if (!state.incidentTypeSelected) {
    return {
      ok: false as const,
      error: "INCIDENT_NOT_SELECTED" as const,
      state,
    };
  }
  if (state.quoteRequired) {
    return {
      ok: false as const,
      error: "QUOTE_REQUIRED" as const,
      state,
    };
  }
  if (state.unlockedForCalls) return { ok: true as const, state };
  return {
    ok: false as const,
    error: "PAYMENT_REQUIRED" as const,
    state,
  };
}
