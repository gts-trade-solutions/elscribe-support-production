export type CallReq = {
  id: string;
  ticketId: string;
  type: "voice" | "video";
  requestedBy: "customer" | "agent";
  status: "pending" | "accepted" | "rejected" | "canceled" | "ended";
  createdAt: string;
  updatedAt: string;
};

export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_customer"
  | "resolved"
  | "closed";

export type TicketPriority = "low" | "medium" | "high" | "critical";

export type AgentTicket = {
  id: string;
  subject: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  assigned_agent_id: string | null;
  created_at: string;
  updated_at: string;
  agent_alias: string;
};

export type Msg = {
  id: string;
  sender_role: "customer" | "agent" | "admin";
  body: string;
  created_at: string;
  created_at_ms?: number;
  sender_user_id?: string;
  ticket_id?: string;
};

export const STATUS_OPTIONS: Array<{ value: TicketStatus; label: string }> = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_customer", label: "Waiting for Customer" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export const PRIORITY_OPTIONS: Array<{
  value: TicketPriority;
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export function safeStatus(v: any): TicketStatus {
  const s = String(v ?? "");
  return (
    STATUS_OPTIONS.some((o) => o.value === s) ? s : "open"
  ) as TicketStatus;
}

export function safePriority(v: any): TicketPriority {
  const s = String(v ?? "");
  return (
    PRIORITY_OPTIONS.some((o) => o.value === s) ? s : "medium"
  ) as TicketPriority;
}

export function shortId(id: string) {
  return id?.slice(0, 8) ?? id;
}

export function formatTs(m: Msg) {
  const ms =
    typeof m.created_at_ms === "number" && Number.isFinite(m.created_at_ms)
      ? m.created_at_ms
      : Date.parse(m.created_at);

  if (!ms) return "";
  return new Date(ms).toLocaleString();
}
