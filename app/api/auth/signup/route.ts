import { NextResponse } from "next/server";
import { z } from "zod";

import { createUserWithIndividualAccount, findUserByEmail } from "@/lib/auth/user-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Email already registered" },
        { status: 409 }
      );
    }

    await createUserWithIndividualAccount({
      email,
      password: parsed.data.password,
      role: "customer",
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
