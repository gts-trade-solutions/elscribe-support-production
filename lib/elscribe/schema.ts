import { z } from "zod";

/**
 * Allowlisted El Scribe handoff payload.
 * Keep this minimal and expand only when required.
 */
export const elscribeHandoffSchema = z.object({
  external_session_id: z.string().min(3).max(128),
  issue_summary: z.string().min(3).max(255),
  description: z.string().max(5000).optional().nullable(),

  // Optional: used only to prefill signup on the customer side.
  // This is NOT exposed to agents.
  customer_email: z.string().email().optional().nullable(),
});

export type ElsHandoffPayload = z.infer<typeof elscribeHandoffSchema>;
