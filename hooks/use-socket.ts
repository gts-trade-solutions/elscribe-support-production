"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

let _socket: Socket | null = null;
let _tokenPromise: Promise<string | null> | null = null;

async function fetchSocketToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/socket/token", { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return typeof json?.token === "string" ? json.token : null;
  } catch {
    return null;
  }
}

function getSocketSingleton(): Socket {
  if (_socket) return _socket;

  _socket = io({
    path: "/socket.io",
    autoConnect: false,
    // We still keep cookies enabled (useful for server-side session + REST),
    // but Socket auth will primarily use the short-lived token.
    withCredentials: true,
    transports: ["websocket", "polling"],
  });

  return _socket;
}

export function useSocket() {
  const socket = useMemo(() => getSocketSingleton(), []);
  const [connected, setConnected] = useState(socket.connected);
  const [lastError, setLastError] = useState<string | null>(null);
  const refreshingRef = useRef(false);

  useEffect(() => {
    const ensureAuthAndConnect = async () => {
      if (socket.connected) return;

      // Prevent multiple parallel refreshes.
      if (refreshingRef.current) return;
      refreshingRef.current = true;

      try {
        // Reuse token promise so multiple components don't spam the API.
        if (!_tokenPromise) _tokenPromise = fetchSocketToken();
        const token = await _tokenPromise;

        // Attach auth payload for handshake.
        socket.auth = { token };

        socket.connect();
      } finally {
        refreshingRef.current = false;
      }
    };

    const onConnect = () => {
      setConnected(true);
      setLastError(null);
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onConnectError = async (err: any) => {
      const msg = err?.message || "connect_error";
      setLastError(msg);
      setConnected(false);

      // If auth failed, refresh token once and retry.
      if (String(msg).toUpperCase().includes("UNAUTHORIZED")) {
        // force refetch
        _tokenPromise = fetchSocketToken();
        const token = await _tokenPromise;
        socket.auth = { token };

        // Backoff tiny bit to avoid tight loop
        setTimeout(() => {
          if (!socket.connected) socket.connect();
        }, 250);
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    ensureAuthAndConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
    };
  }, [socket]);

  return { socket, connected, lastError };
}
