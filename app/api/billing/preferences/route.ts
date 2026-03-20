import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error: "FEATURE_DISABLED",
      message:
        "Saved-card / pay-after-resolution billing is disabled in the current production pricing model.",
    },
    { status: 410 },
  );
}
