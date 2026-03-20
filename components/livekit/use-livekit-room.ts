"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Room, RoomEvent, Track, type Participant } from "livekit-client";
import { CallReq, TokenResponse } from "./livekit-types";
import { pickTracks, safeJson } from "./livekit-utils";

export function useLivekitRoom({
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
  const roomRef = useRef<Room | null>(null);
  const autoJoinKeyRef = useRef<string | null>(null);
  const hadConnectedRef = useRef(false);
  const localEndRef = useRef(false);

  const [room, setRoom] = useState<Room | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const [callReq, setCallReq] = useState<CallReq | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const [micEnabled, setMicEnabled] = useState(false);
  const [camEnabled, setCamEnabled] = useState(false);
  const [screenEnabled, setScreenEnabled] = useState(false);

  const callType: "voice" | "video" = callReq?.type || callTypeHint || "voice";

  const canJoin = useMemo(() => {
    return Boolean(ticketId && /^[0-9a-fA-F-]{10,}$/.test(ticketId));
  }, [ticketId]);

  const syncParticipants = (r: Room) => {
    const remoteMap: Map<any, any> =
      ((r as any).remoteParticipants as any) ??
      ((r as any).participants as any) ??
      new Map();

    const list: Participant[] = [
      r.localParticipant,
      ...Array.from(remoteMap.values()),
    ];

    setParticipants(list);

    try {
      const lp: any = r.localParticipant as any;
      setMicEnabled(Boolean(lp?.isMicrophoneEnabled));
      setCamEnabled(Boolean(lp?.isCameraEnabled));

      const hasScreen = Array.from(
        lp?.trackPublications?.values?.() ?? [],
      ).some(
        (pub: any) => pub?.source === Track.Source.ScreenShare && pub?.track,
      );

      setScreenEnabled(Boolean(hasScreen));
    } catch {
      return;
    }
  };

  const publishNotice = (message: string) => {
    setStatusNote(message);
    onNotice?.(message);
  };

  const clearStatusSoon = (ms = 2200) => {
    window.setTimeout(() => {
      setStatusNote((prev) => (prev ? null : prev));
    }, ms);
  };

  const join = async () => {
    if (!canJoin || connecting) return;
    if (roomRef.current && connected) return;

    setError(null);
    setStatusNote(null);
    setConnecting(true);
    localEndRef.current = false;

    try {
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });

      const data = (await safeJson(res)) as TokenResponse | any;
      if (!res.ok) {
        throw new Error(
          data?.message || data?.error || "Failed to fetch LiveKit token",
        );
      }

      setCallReq(data.callRequest);

      const r = new Room();
      roomRef.current = r;

      const onAnyChange = () => syncParticipants(r);

      r.on(RoomEvent.Connected, () => {
        hadConnectedRef.current = true;
        setError(null);
        setStatusNote(null);
        setConnected(true);
        setConnecting(false);
        setIsReconnecting(false);
        onAnyChange();
      });

      r.on(RoomEvent.Reconnecting, () => {
        setIsReconnecting(true);
        publishNotice("Connection is unstable. Reconnecting live video…");
      });

      r.on(RoomEvent.Reconnected, () => {
        setIsReconnecting(false);
        setError(null);
        publishNotice("Connection restored.");
        clearStatusSoon();
        onAnyChange();
      });

      r.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        setConnecting(false);
        setIsReconnecting(false);
        setParticipants([]);
        setPinnedId(null);
        setActiveSpeakerId(null);
        setScreenEnabled(false);

        if (localEndRef.current) {
          publishNotice(
            "Call ended. You can continue in chat or request another live session if needed.",
          );
          setError(null);
        } else if (hadConnectedRef.current) {
          publishNotice("The live call ended or the connection was lost.");
          setError(
            "The live session ended or disconnected. If the call is still active, retry the connection.",
          );
        }
      });

      r.on(RoomEvent.ParticipantConnected, onAnyChange);
      r.on(RoomEvent.ParticipantDisconnected, onAnyChange);
      r.on(RoomEvent.TrackSubscribed, onAnyChange);
      r.on(RoomEvent.TrackUnsubscribed, onAnyChange);
      r.on(RoomEvent.LocalTrackPublished, onAnyChange);
      r.on(RoomEvent.LocalTrackUnpublished, onAnyChange);

      r.on(RoomEvent.ActiveSpeakersChanged, (speakers: any[]) => {
        const top = speakers?.[0]?.identity
          ? String(speakers[0].identity)
          : null;
        setActiveSpeakerId(top);
      });

      await r.connect(data.url, data.token);

      await r.localParticipant.setMicrophoneEnabled(true);
      setMicEnabled(true);

      const isVideoCall = data.callRequest?.type === "video";
      if (isVideoCall) {
        await r.localParticipant.setCameraEnabled(true);
        setCamEnabled(true);
      } else {
        await r.localParticipant.setCameraEnabled(false);
        setCamEnabled(false);
      }

      setRoom(r);
      setConnected(true);
      setConnecting(false);
      syncParticipants(r);
    } catch (e: any) {
      setConnecting(false);
      setConnected(false);
      setIsReconnecting(false);

      const msg = String(e?.message || "Failed to join call");

      if (msg.toLowerCase().includes("invalid authorization token")) {
        setError(
          "LiveKit rejected the token (invalid authorization token). This usually means LIVEKIT_URL/LIVEKIT_WS_URL points to a different LiveKit deployment than the API key/secret, or the secret has extra quotes/spaces. Verify the same deployment is used everywhere.",
        );
      } else {
        setError(msg);
      }

      try {
        roomRef.current?.disconnect();
      } catch {
        return;
      }

      roomRef.current = null;
      setRoom(null);
    }
  };

  const endCall = async () => {
    if (!ticketId) return;
    const reqId = callRequestId || callReq?.id;

    localEndRef.current = true;
    publishNotice("Ending call…");

    try {
      if (reqId) {
        await fetch(`/api/tickets/${ticketId}/call-request/${reqId}/end`, {
          method: "POST",
        });
      }
    } catch {
      return;
    }

    try {
      roomRef.current?.disconnect();
    } catch {
      return;
    }

    roomRef.current = null;
    setRoom(null);
    setConnected(false);
    setParticipants([]);
    setPinnedId(null);
    setActiveSpeakerId(null);
    setScreenEnabled(false);
    publishNotice(
      "Call ended. You can continue in chat or request another live session if needed.",
    );
  };

  const toggleMic = async () => {
    const r = roomRef.current;
    if (!r) return;
    const next = !micEnabled;
    setMicEnabled(next);

    try {
      await r.localParticipant.setMicrophoneEnabled(next);
    } catch {
      setMicEnabled(!next);
    }
  };

  const toggleCam = async () => {
    if (callType !== "video") return;
    const r = roomRef.current;
    if (!r) return;
    const next = !camEnabled;
    setCamEnabled(next);

    try {
      await r.localParticipant.setCameraEnabled(next);
    } catch {
      setCamEnabled(!next);
    }
  };

  const toggleScreenShare = async () => {
    if (callType !== "video") return;
    const r = roomRef.current;
    if (!r) return;

    const next = !screenEnabled;
    setScreenEnabled(next);

    try {
      await r.localParticipant.setScreenShareEnabled(next);
    } catch {
      setScreenEnabled(!next);
      return;
    }

    try {
      await fetch(`/api/tickets/${ticketId}/screen-share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next ? "started" : "stopped" }),
      });
    } catch {
      return;
    }
  };

  useEffect(() => {
    if (!autoJoin || !callRequestId || !canJoin || connected || connecting)
      return;
    const key = `${ticketId}:${callRequestId}`;
    if (autoJoinKeyRef.current === key) return;
    autoJoinKeyRef.current = key;
    void join();
  }, [autoJoin, callRequestId, canJoin, connected, connecting, ticketId]);

  useEffect(() => {
    return () => {
      try {
        roomRef.current?.disconnect();
      } catch {
        return;
      }
      roomRef.current = null;
    };
  }, []);

  const stageInfo = useMemo(() => {
    if (!room) {
      const lp = participants.find((p) => (p as any).isLocal) || null;
      return {
        stageParticipant: lp,
        stageTrack: null,
        stageMode: "voice" as const,
      };
    }

    for (const p of participants) {
      const { screen } = pickTracks(p);
      if (screen) {
        return {
          stageParticipant: p,
          stageTrack: screen,
          stageMode: "screen" as const,
        };
      }
    }

    const findById = (id: string | null) => {
      if (!id) return null;
      return (
        participants.find((p) => String(p.identity) === String(id)) || null
      );
    };

    const pinned = findById(pinnedId);
    const remote = participants.filter((p) => !(p as any).isLocal);
    const fallbackRemote = remote[0] || null;
    const local = participants.find((p) => (p as any).isLocal) || null;

    const chosen =
      pinned ||
      (callType === "voice" ? findById(activeSpeakerId) : null) ||
      fallbackRemote ||
      local ||
      participants[0] ||
      null;

    const { camera } = chosen ? pickTracks(chosen) : { camera: null };
    const mode = callType === "video" && camera ? "camera" : "voice";

    return {
      stageParticipant: chosen,
      stageTrack: camera,
      stageMode: mode as "camera" | "voice",
    };
  }, [room, participants, pinnedId, activeSpeakerId, callType]);

  const remoteAudioTracks = useMemo(() => {
    if (!room) return [] as Array<{ id: string; track: any }>;

    const remotes = participants.filter((p) => !(p as any).isLocal);
    const list: Array<{ id: string; track: any }> = [];

    for (const p of remotes) {
      const { audio } = pickTracks(p);
      if (audio) list.push({ id: String(p.identity), track: audio });
    }

    return list;
  }, [room, participants]);

  return {
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
  };
}
