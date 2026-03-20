export type Ticket = {
  id: string;
  subject: string;
  description: string | null;
  status: string;
  created_at: string;
  priority?: string;
  category?: string | null;
  assigned_agent_id?: string | null;
  incident_type_selected?: string | null;
  resolution_incident_type?: string | null;
};

export type IncidentItem = {
  code: string;
  label: string;
  amount: number | null;
  pricingModel: "fixed" | "quoted";
  publicPriceLabel: string;
  helper?: string;
  category?: string;
};

export type BillingState = {
  isPaid: boolean;
  latestPaymentStatus: string | null;
  paymentRequired: boolean;
  quoteRequired: boolean;
  quoteAvailable: boolean;
  quoteAmount: number | null;
  quoteCurrency: string | null;
  quoteNote: string | null;
  quoteUpdatedAt: string | null;
  unlockedForCalls: boolean;
  incidentTypeSelected: string | null;
  resolutionIncidentType: string | null;
  coveredByPlan?: boolean;
  coveredPlanCode?: string | null;
  billingOverrideState?: "cleared" | "blocked" | null;
  billingOverrideNote?: string | null;
};

export type Msg = {
  id: string;
  sender_role: "customer" | "agent" | "admin";
  sender_user_id?: string;
  body: string;
  created_at: string;
  created_at_ms?: number;
  ticket_id?: string;
};

export type CallReq = {
  id: string;
  ticketId: string;
  type: "voice" | "video";
  requestedBy: "customer" | "agent";
  status: "pending" | "accepted" | "rejected" | "canceled" | "ended";
  createdAt: string;
  updatedAt: string;
};

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: "bad_json", message: text };
  }
}

export function formatTs(m: Msg) {
  const ms =
    typeof m.created_at_ms === "number" && Number.isFinite(m.created_at_ms)
      ? m.created_at_ms
      : Date.parse(m.created_at);

  if (!ms) return "";
  return new Date(ms).toLocaleString();
}

export function isLikelyTicketId(value: string) {
  return /^[0-9a-fA-F-]{10,}$/.test(String(value || "").trim());
}
