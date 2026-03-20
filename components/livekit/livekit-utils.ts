import { Track, type Participant } from "livekit-client";

export async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: "bad_json", message: text };
  }
}

export function initials(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return "?";
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

export function pickTracks(p: Participant) {
  let camera: any | null = null;
  let screen: any | null = null;
  let audio: any | null = null;

  (p as any).trackPublications?.forEach?.((pub: any) => {
    if (!pub?.track) return;

    if (pub.kind === Track.Kind.Video) {
      if (pub.source === Track.Source.ScreenShare) screen = pub.track;
      else camera = pub.track;
    }

    if (pub.kind === Track.Kind.Audio) {
      audio = pub.track;
    }
  });

  return { camera, screen, audio };
}
