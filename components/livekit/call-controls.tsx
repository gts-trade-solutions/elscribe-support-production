"use client";

import {
  Maximize2,
  Mic,
  MicOff,
  PhoneOff,
  ScreenShare,
  ScreenShareOff,
  Video,
  VideoOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function CallControls({
  connected,
  connecting,
  canJoin,
  callType,
  micEnabled,
  camEnabled,
  screenEnabled,
  onJoin,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onEnd,
  onExpand,
  showRetry,
}: {
  connected: boolean;
  connecting: boolean;
  canJoin: boolean;
  callType: "voice" | "video";
  micEnabled: boolean;
  camEnabled: boolean;
  screenEnabled: boolean;
  onJoin: () => void;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  onEnd: () => void;
  onExpand: () => void;
  showRetry?: boolean;
}) {
  if (!connected) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {showRetry ? (
          <Button
            onClick={onJoin}
            disabled={!canJoin || connecting}
            className="w-full"
          >
            {connecting ? "Reconnecting…" : "Retry connection"}
          </Button>
        ) : (
          <div className="w-full rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {connecting
              ? "Connecting you automatically…"
              : "Preparing the live session automatically…"}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant={micEnabled ? "default" : "secondary"}
        size="sm"
        onClick={onToggleMic}
        title={micEnabled ? "Mute" : "Unmute"}
      >
        {micEnabled ? (
          <Mic className="mr-2 h-4 w-4" />
        ) : (
          <MicOff className="mr-2 h-4 w-4" />
        )}
        {micEnabled ? "Mute" : "Unmute"}
      </Button>

      <Button
        variant={camEnabled ? "default" : "secondary"}
        size="sm"
        onClick={onToggleCam}
        disabled={callType !== "video"}
        title={callType !== "video" ? "Camera is for video calls" : ""}
      >
        {camEnabled ? (
          <Video className="mr-2 h-4 w-4" />
        ) : (
          <VideoOff className="mr-2 h-4 w-4" />
        )}
        {camEnabled ? "Camera on" : "Camera off"}
      </Button>

      <Button
        variant={screenEnabled ? "default" : "secondary"}
        size="sm"
        onClick={onToggleScreenShare}
        disabled={callType !== "video"}
        title={callType !== "video" ? "Screen share is for video calls" : ""}
      >
        {screenEnabled ? (
          <ScreenShareOff className="mr-2 h-4 w-4" />
        ) : (
          <ScreenShare className="mr-2 h-4 w-4" />
        )}
        {screenEnabled ? "Stop share" : "Share"}
      </Button>

      <Button variant="outline" size="sm" onClick={onExpand} title="Expand">
        <Maximize2 className="mr-2 h-4 w-4" />
        Expand
      </Button>

      <Button variant="destructive" size="sm" onClick={onEnd} title="End call">
        <PhoneOff className="mr-2 h-4 w-4" />
        End
      </Button>
    </div>
  );
}
