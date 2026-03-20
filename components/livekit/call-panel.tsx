"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrackView } from "./track-view";
import { CallControls } from "./call-controls";
import { CallFilmstrip } from "./call-filmstrip";
import { CallStage } from "./call-stage";
import { useLivekitRoom } from "./use-livekit-room";

export default function CallPanel({
  ticketId,
  callRequestId,
  callTypeHint,
  autoJoin = true,
  onNotice,
}: {
  ticketId: string;
  callRequestId?: string;
  callTypeHint?: "voice" | "video";
  autoJoin?: boolean;
  onNotice?: (message: string) => void;
}) {
  const {
    connected,
    connecting,
    error,
    statusNote,
    isReconnecting,
    callType,
    participants,
    expanded,
    setExpanded,
    micEnabled,
    camEnabled,
    screenEnabled,
    canJoin,
    join,
    endCall,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    pinnedId,
    setPinnedId,
    stageInfo,
    remoteAudioTracks,
  } = useLivekitRoom({
    ticketId,
    callRequestId,
    callTypeHint,
    autoJoin,
    onNotice,
  });

  const content = (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="min-h-0 flex-1">
        <CallStage
          callType={callType}
          participant={stageInfo.stageParticipant}
          stageTrack={stageInfo.stageTrack}
          stageMode={stageInfo.stageMode}
          participants={participants}
          connected={connected}
        />
      </div>

      <div className="shrink-0">
        <CallFilmstrip
          participants={participants}
          callType={callType}
          pinnedId={pinnedId}
          onTogglePin={(identity) =>
            setPinnedId((prev) => (prev === identity ? null : identity))
          }
        />
      </div>
    </div>
  );

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader className="shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-lg">Live Call</CardTitle>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant={connected ? "default" : "secondary"}>
                {connected
                  ? isReconnecting
                    ? "Reconnecting"
                    : "Connected"
                  : connecting
                    ? "Connecting"
                    : "Not connected"}
              </Badge>
              <Badge variant="outline">{callType}</Badge>
              <Badge variant="outline">{participants.length} in room</Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        {statusNote ? (
          <div className="whitespace-pre-line rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            {statusNote}
          </div>
        ) : null}

        {error ? (
          <div className="whitespace-pre-line rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="shrink-0">
          <CallControls
            connected={connected}
            connecting={connecting}
            canJoin={canJoin}
            callType={callType}
            micEnabled={micEnabled}
            camEnabled={camEnabled}
            screenEnabled={screenEnabled}
            onJoin={join}
            onToggleMic={toggleMic}
            onToggleCam={toggleCam}
            onToggleScreenShare={toggleScreenShare}
            onEnd={endCall}
            onExpand={() => setExpanded(true)}
            showRetry={Boolean(error)}
          />
        </div>

        <div className="min-h-[280px] flex-1 lg:min-h-0">{content}</div>

        {remoteAudioTracks.map((a) => (
          <TrackView key={a.id} track={a.track} kind="audio" />
        ))}

        <Dialog open={expanded} onOpenChange={setExpanded}>
          <DialogContent className="flex h-[78vh] max-w-6xl flex-col overflow-hidden">
            <DialogHeader className="shrink-0">
              <DialogTitle>Live Call</DialogTitle>
            </DialogHeader>

            <div className="min-h-0 flex-1">{content}</div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
