"use client";

import type { Participant } from "livekit-client";
import { TrackView } from "./track-view";
import { initials, pickTracks } from "./livekit-utils";
import { cn } from "@/lib/utils";

export function CallStage({
  callType,
  participant,
  stageTrack,
  stageMode,
  participants,
  connected,
}: {
  callType: "voice" | "video";
  participant: Participant | null;
  stageTrack: any | null;
  stageMode: "camera" | "screen" | "voice";
  participants: Participant[];
  connected: boolean;
}) {
  if (!participant) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl border bg-muted text-sm text-muted-foreground">
        {connected ? "Waiting for participants…" : "Join the call to begin."}
      </div>
    );
  }

  const isLocalParticipant = Boolean((participant as any).isLocal);
  const isStageVoice =
    callType === "voice" || stageMode === "voice" || !stageTrack;

  const stageNode = isStageVoice ? (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border bg-muted">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-background text-xl font-semibold shadow">
        {initials(participant.name || participant.identity)}
      </div>
      <div className="text-sm font-medium">
        {participant.name || participant.identity}
      </div>
      <div className="text-xs text-muted-foreground">Voice call</div>
    </div>
  ) : (
    <div className="relative h-full w-full overflow-hidden rounded-xl border bg-black">
      <TrackView
        track={stageTrack}
        kind="video"
        muted={isLocalParticipant}
        mirror={isLocalParticipant && stageMode !== "screen"}
        className={cn(
          stageMode === "screen" ? "object-contain" : "object-cover",
        )}
      />
      <div className="absolute left-3 top-3 rounded-md bg-black/50 px-2 py-1 text-xs text-white">
        {participant.name || participant.identity}
        {isLocalParticipant ? " (You)" : ""}
        {stageMode === "screen" ? " • Screen" : ""}
      </div>
    </div>
  );

  if (!connected || callType !== "video") {
    return stageNode;
  }

  const localParticipant = participants.find((p) => (p as any).isLocal) || null;
  const stageIsLocal = Boolean(
    localParticipant && participant.identity === localParticipant.identity,
  );

  if (!localParticipant || stageIsLocal) {
    return stageNode;
  }

  const { camera } = pickTracks(localParticipant);
  if (!camera) {
    return stageNode;
  }

  return (
    <div className="relative h-full w-full">
      {stageNode}
      <div className="absolute bottom-3 right-3 h-24 w-36 overflow-hidden rounded-lg border bg-black shadow">
        <TrackView
          track={camera}
          kind="video"
          muted
          mirror
          className="object-cover"
        />
        <div className="absolute left-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
          You
        </div>
      </div>
    </div>
  );
}
