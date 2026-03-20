"use client";

import type { Participant } from "livekit-client";
import { Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { TrackView } from "./track-view";
import { initials, pickTracks } from "./livekit-utils";

function ParticipantTile({
  participant,
  isPinned,
  onPin,
  callType,
}: {
  participant: Participant;
  isPinned: boolean;
  onPin: () => void;
  callType: "voice" | "video";
}) {
  const { camera, screen } = pickTracks(participant);
  const isLocal = (participant as any).isLocal;

  const showVideo = callType === "video" && (screen || camera);
  const track = screen || camera;

  return (
    <button
      type="button"
      onClick={onPin}
      className={cn(
        "group relative flex h-20 w-28 shrink-0 overflow-hidden rounded-lg border bg-muted text-left",
        isPinned ? "ring-2 ring-primary" : "hover:border-primary/50",
      )}
      title={isPinned ? "Pinned" : "Pin to stage"}
    >
      {showVideo && track ? (
        <TrackView
          track={track}
          kind="video"
          muted={Boolean(isLocal)}
          mirror={Boolean(isLocal && !screen)}
          className={cn(screen ? "object-contain" : "object-cover")}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-background">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
            {initials(participant.name || participant.identity)}
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/50 px-2 py-1">
        <div className="truncate text-[11px] text-white">
          {participant.name || participant.identity}
          {isLocal ? " (You)" : ""}
        </div>
        <div
          className={cn(
            "opacity-0 transition-opacity group-hover:opacity-100",
            isPinned ? "opacity-100" : "",
          )}
        >
          <Pin className="h-3 w-3 text-white" />
        </div>
      </div>
    </button>
  );
}

export function CallFilmstrip({
  participants,
  callType,
  pinnedId,
  onTogglePin,
}: {
  participants: Participant[];
  callType: "voice" | "video";
  pinnedId: string | null;
  onTogglePin: (identity: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {participants.map((participant) => {
        const identity = String(participant.identity);
        return (
          <ParticipantTile
            key={identity}
            participant={participant}
            callType={callType}
            isPinned={pinnedId === identity}
            onPin={() => onTogglePin(identity)}
          />
        );
      })}
    </div>
  );
}
