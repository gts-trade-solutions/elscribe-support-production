import { NextResponse, type NextRequest } from "next/server";
import { requireAuthToken } from "@/lib/auth/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RawListRow = {
  id: string;
  ticket_id: string;
  guest_user_id: string;
  created_by_user_id: string;
  expires_at: string | Date;
  revoked_at: string | Date | null;
  revoked_by_user_id: string | null;
  last_visited_at: string | Date | null;
  visit_count: number;
  created_at: string | Date;
  updated_at: string | Date;
  guest_email: string | null;
  creator_email: string | null;
  creator_agent_alias: string | null;
  ticket_subject?: string | null;
};

type StatusFilter = "active" | "expired" | "revoked" | "all";

function parseStatus(v: string | null): StatusFilter {
  if (v === "expired" || v === "revoked" || v === "all") return v;
  return "active";
}

function parseLimit(v: string | null): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 200;
  return Math.min(Math.floor(n), 500);
}

function toIso(v: string | Date | null): string | null {
  if (v == null) return null;
  return new Date(v).toISOString();
}

function deriveStatus(row: {
  revokedAt: string | null;
  expiresAt: string;
}): "active" | "expired" | "revoked" {
  if (row.revokedAt) return "revoked";
  if (new Date(row.expiresAt).getTime() <= Date.now()) return "expired";
  return "active";
}

export async function GET(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "admin") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const ticketId = req.nextUrl.searchParams.get("ticketId");

    let rows: RawListRow[];

    if (ticketId) {
      // token_hash is deliberately excluded even though no raw token material
      // is ever stored — hash disclosure is still defense-in-depth noise.
      rows = await query<RawListRow>(
        `SELECT l.id,
                l.ticket_id,
                l.guest_user_id,
                l.created_by_user_id,
                l.expires_at,
                l.revoked_at,
                l.revoked_by_user_id,
                l.last_visited_at,
                l.visit_count,
                l.created_at,
                l.updated_at,
                guest_priv.email     AS guest_email,
                creator.email        AS creator_email,
                (
                  SELECT ta.agent_alias
                    FROM ticket_aliases ta
                    JOIN tickets t2 ON t2.id = ta.ticket_id
                   WHERE t2.assigned_agent_id = l.created_by_user_id
                     AND ta.ticket_id = l.ticket_id
                   LIMIT 1
                ) AS creator_agent_alias,
                t.subject            AS ticket_subject
           FROM ticket_magic_links l
      LEFT JOIN customer_private_profiles guest_priv
             ON guest_priv.user_id = l.guest_user_id
      LEFT JOIN users creator
             ON creator.id = l.created_by_user_id
      LEFT JOIN tickets t
             ON t.id = l.ticket_id
          WHERE l.ticket_id = ?
          ORDER BY l.created_at DESC`,
        [ticketId],
      );
    } else {
      const status = parseStatus(req.nextUrl.searchParams.get("status"));
      const limit = parseLimit(req.nextUrl.searchParams.get("limit"));
      const search = (req.nextUrl.searchParams.get("search") || "").trim();

      const whereClauses: string[] = [];
      const params: Array<string | number> = [];

      if (status === "active") {
        whereClauses.push(
          "l.revoked_at IS NULL AND l.expires_at > UTC_TIMESTAMP()",
        );
      } else if (status === "expired") {
        whereClauses.push(
          "l.revoked_at IS NULL AND l.expires_at <= UTC_TIMESTAMP()",
        );
      } else if (status === "revoked") {
        whereClauses.push("l.revoked_at IS NOT NULL");
      }

      if (search) {
        whereClauses.push("(guest_priv.email LIKE ? OR l.ticket_id = ?)");
        params.push(`%${search}%`);
        params.push(search);
      }

      const whereSql = whereClauses.length
        ? `WHERE ${whereClauses.join(" AND ")}`
        : "";

      // LIMIT is inlined as a sanitized integer; mysql2 prepared statements
      // don't bind LIMIT reliably across driver versions.
      rows = await query<RawListRow>(
        `SELECT l.id,
                l.ticket_id,
                l.guest_user_id,
                l.created_by_user_id,
                l.expires_at,
                l.revoked_at,
                l.revoked_by_user_id,
                l.last_visited_at,
                l.visit_count,
                l.created_at,
                l.updated_at,
                guest_priv.email     AS guest_email,
                creator.email        AS creator_email,
                (
                  SELECT ta.agent_alias
                    FROM ticket_aliases ta
                    JOIN tickets t2 ON t2.id = ta.ticket_id
                   WHERE t2.assigned_agent_id = l.created_by_user_id
                     AND ta.ticket_id = l.ticket_id
                   LIMIT 1
                ) AS creator_agent_alias,
                t.subject            AS ticket_subject
           FROM ticket_magic_links l
      LEFT JOIN customer_private_profiles guest_priv
             ON guest_priv.user_id = l.guest_user_id
      LEFT JOIN users creator
             ON creator.id = l.created_by_user_id
      LEFT JOIN tickets t
             ON t.id = l.ticket_id
          ${whereSql}
          ORDER BY l.created_at DESC
          LIMIT ${limit}`,
        params,
      );
    }

    const links = rows.map((r) => {
      const expiresAt = new Date(r.expires_at).toISOString();
      const revokedAt = toIso(r.revoked_at);
      return {
        id: String(r.id),
        ticketId: String(r.ticket_id),
        guestUserId: String(r.guest_user_id),
        guestEmail: r.guest_email ? String(r.guest_email) : null,
        createdByUserId: String(r.created_by_user_id),
        createdByEmail: r.creator_email ? String(r.creator_email) : null,
        createdByAgentAlias: r.creator_agent_alias
          ? String(r.creator_agent_alias)
          : null,
        expiresAt,
        revokedAt,
        revokedByUserId: r.revoked_by_user_id
          ? String(r.revoked_by_user_id)
          : null,
        lastVisitedAt: toIso(r.last_visited_at),
        visitCount: Number(r.visit_count ?? 0),
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
        status: deriveStatus({ revokedAt, expiresAt }),
        ticketSubject: r.ticket_subject ? String(r.ticket_subject) : null,
      };
    });

    return NextResponse.json({ links });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
