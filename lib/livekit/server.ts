import "server-only";

import { AccessToken } from "livekit-server-sdk";

export type LiveKitGrants = {
  room: string;
  roomJoin: boolean;
  canPublish: boolean;
  canSubscribe: boolean;
  canPublishData?: boolean;
};

function normalizeEnvValue(v: string | undefined | null) {
  if (!v) return "";
  let x = String(v).trim();

  // Common copy/paste mistakes in .env on Windows:
  // LIVEKIT_API_SECRET="..." (quotes included)
  // or trailing spaces/newlines.
  if (
    (x.startsWith('"') && x.endsWith('"')) ||
    (x.startsWith("'") && x.endsWith("'"))
  ) {
    x = x.slice(1, -1);
  }

  return x.trim();
}

function normalizeWsUrl(raw: string) {
  let url = raw.trim();

  // Normalize scheme
  if (url.startsWith("https://")) url = "wss://" + url.slice("https://".length);
  else if (url.startsWith("http://"))
    url = "ws://" + url.slice("http://".length);
  else if (url.startsWith("wss://") || url.startsWith("ws://")) {
    // ok
  } else {
    // If user pasted just a hostname, assume secure.
    url = `wss://${url}`;
  }

  // Remove trailing slash
  url = url.replace(/\/+$/, "");

  return url;
}

function wsToHttpUrl(wsUrl: string) {
  if (wsUrl.startsWith("wss://"))
    return "https://" + wsUrl.slice("wss://".length);
  if (wsUrl.startsWith("ws://")) return "http://" + wsUrl.slice("ws://".length);
  return wsUrl;
}

export function livekitRoomNameForTicket(ticketId: string) {
  return `ticket_${ticketId}`;
}

/**
 * Reads LiveKit env vars and returns normalized URLs.
 *
 * Supports both:
 * - LIVEKIT_URL (preferred)
 * - LIVEKIT_WS_URL (legacy from earlier env template)
 */
export function getLiveKitEnv() {
  const rawUrl =
    normalizeEnvValue(process.env.LIVEKIT_URL) ||
    normalizeEnvValue(process.env.LIVEKIT_WS_URL);
  const apiKey = normalizeEnvValue(process.env.LIVEKIT_API_KEY);
  const apiSecret = normalizeEnvValue(process.env.LIVEKIT_API_SECRET);

  if (!rawUrl || !apiKey || !apiSecret) {
    throw new Error(
      "Missing LiveKit env vars. Required: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL (or LIVEKIT_WS_URL)",
    );
  }

  const url = normalizeWsUrl(rawUrl);
  const httpUrl = wsToHttpUrl(url);

  return { url, httpUrl, apiKey, apiSecret };
}

export async function mintLiveKitToken(opts: {
  identity: string;
  name: string;
  roomName: string;
  grants: Omit<LiveKitGrants, "room">;
}) {
  const { apiKey, apiSecret } = getLiveKitEnv();

  // IMPORTANT:
  // In livekit-server-sdk v2, ttl is applied when passed via AccessToken options.
  // If you set token.ttl after construction as a number (e.g., 1800), jose interprets
  // it as an absolute Unix timestamp (1970 era), making tokens immediately invalid.
  const token = new AccessToken(apiKey, apiSecret, {
    identity: opts.identity,
    name: opts.name,
    ttl: "30m", // relative duration (recommended)
  });

  token.addGrant({
    room: opts.roomName,
    roomJoin: true,
    canPublish: opts.grants.canPublish,
    canSubscribe: opts.grants.canSubscribe,
    canPublishData: opts.grants.canPublishData ?? true,
  });

  return await token.toJwt();
}
