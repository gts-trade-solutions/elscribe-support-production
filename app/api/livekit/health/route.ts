import { NextResponse, type NextRequest } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { requireAuthToken } from "@/lib/auth/server";
import { getLiveKitEnv } from "@/lib/livekit/server";

// Admin-only LiveKit credential check.
// Use this to quickly confirm that LIVEKIT_URL/LIVEKIT_WS_URL + API key/secret match your LiveKit deployment.
export async function GET(req: NextRequest) {
  try {
    const token = await requireAuthToken(req);
    if (token.role !== "admin") {
      return NextResponse.json(
        { ok: false, error: "forbidden", message: "Admin only" },
        { status: 403 },
      );
    }

    const { url, httpUrl, apiKey, apiSecret } = getLiveKitEnv();

    // RoomServiceClient expects an HTTP(S) URL.
    const client = new RoomServiceClient(httpUrl, apiKey, apiSecret);

    const rooms = await client.listRooms();

    return NextResponse.json({
      ok: true,
      wsUrl: url,
      httpUrl,
      roomsCount: Array.isArray(rooms) ? rooms.length : 0,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "livekit_health_failed",
        message: e?.message ?? "Unknown error",
      },
      { status: e?.message === "UNAUTHORIZED" ? 401 : 500 },
    );
  }
}
