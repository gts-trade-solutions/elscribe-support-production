"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function TrackView({
  track,
  kind,
  className,
  muted,
  mirror = false,
}: {
  track: any;
  kind: "video" | "audio";
  className?: string;
  muted?: boolean;
  mirror?: boolean;
}) {
  const ref = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return;

    try {
      track.attach(el);

      if (kind === "video") {
        const video = el as HTMLVideoElement;
        video.style.transform = mirror ? "scaleX(-1)" : "none";
      }

      return () => {
        try {
          if (kind === "video") {
            const video = el as HTMLVideoElement;
            video.style.transform = "";
          }
          track.detach(el);
        } catch {
          return;
        }
      };
    } catch {
      return;
    }
  }, [track, kind, mirror]);

  if (kind === "audio") {
    return (
      <audio ref={ref as any} autoPlay playsInline muted={Boolean(muted)} />
    );
  }

  return (
    <video
      ref={ref as any}
      autoPlay
      playsInline
      muted={Boolean(muted)}
      className={cn("h-full w-full", className)}
    />
  );
}
