import { NextResponse } from "next/server";
import { elscribeHandoffSchema } from "@/lib/elscribe/schema";
import { verifyElscribeHmac } from "@/lib/elscribe/verify";
import { createOrGetElscribeTicket } from "@/lib/elscribe/handoff-repo";
import { signHandoffToken } from "@/lib/handoff-token";
import { getServerAppBaseUrl } from "@/lib/app-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const sig = req.headers.get("x-elscribe-signature");
    const secret = process.env.ELSCRIBE_HANDOFF_SECRET;

    const ok = verifyElscribeHmac({ rawBody, signatureHex: sig, secret });
    if (!ok) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }

    const json = JSON.parse(rawBody);
    const parsed = elscribeHandoffSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { ticketId } = await createOrGetElscribeTicket(parsed.data);

    const token = await signHandoffToken({
      ticketId,
      externalSessionId: parsed.data.external_session_id,
      ttlSeconds: 10 * 60,
    });

    const origin = getServerAppBaseUrl(req.url);
    if (!origin) {
      return NextResponse.json(
        { error: "server_error", message: "App base URL is not configured" },
        { status: 500 },
      );
    }

    const redirect_url = `${origin}/handoff/${encodeURIComponent(token)}`;

    return NextResponse.json({ redirect_url, ticket_id: ticketId });
  } catch (e: any) {
    return NextResponse.json(
      { error: "server_error", message: e?.message || String(e) },
      { status: 500 },
    );
  }
}
