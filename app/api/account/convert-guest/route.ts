import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthToken } from "@/lib/auth/server";
import { transaction } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { insertAuditLog } from "@/lib/audit-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    if (!token.isGuest) {
      return NextResponse.json(
        { error: "NOT_A_GUEST" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const result = await transaction(async (tx) => {
      // Reconfirm guest state from the row itself — don't trust the session
      // alone. Pull email too so we can surface a collision message if
      // another real row ever shares it (data-migration edge).
      const rows = await tx.query<{
        id: string;
        email: string;
        is_guest: number;
      }>(
        `SELECT id, email, is_guest FROM users WHERE id = ? LIMIT 1`,
        [token.uid],
      );
      const me = rows[0];
      if (!me) return { code: "NOT_FOUND" as const };
      if (Number(me.is_guest) !== 1) {
        return { code: "NOT_A_GUEST" as const };
      }

      const collisions = await tx.query<{ id: string }>(
        `SELECT id FROM users
          WHERE LOWER(email) = LOWER(?)
            AND id <> ?
          LIMIT 1`,
        [me.email, me.id],
      );
      if (collisions[0]) {
        return { code: "EMAIL_TAKEN" as const };
      }

      await tx.exec(
        `UPDATE users
            SET password_hash = ?,
                is_guest = 0,
                updated_at = NOW()
          WHERE id = ?
            AND is_guest = 1`,
        [passwordHash, me.id],
      );

      return { code: "OK" as const, email: me.email, userId: me.id };
    });

    if (result.code === "NOT_FOUND") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (result.code === "NOT_A_GUEST") {
      return NextResponse.json({ error: "NOT_A_GUEST" }, { status: 403 });
    }
    if (result.code === "EMAIL_TAKEN") {
      return NextResponse.json(
        {
          error: "EMAIL_TAKEN",
          message:
            "An account with this email already exists. Please sign in instead.",
        },
        { status: 409 },
      );
    }

    await insertAuditLog({
      actor: token,
      action: "guest_user.converted",
      entityType: "user",
      entityId: result.userId,
      metadata: { userId: result.userId, email: result.email },
    });

    return NextResponse.json({ ok: true, email: result.email });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
