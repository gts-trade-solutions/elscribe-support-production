// lib/realtime.ts
//
// Small helper to emit Socket.IO events from Next.js route handlers.
// This works in the custom Node server setup where server.js attaches
// Socket.IO and stores it on globalThis.__fixmate_io.

export function emitToTicketRoom(
  ticketId: string,
  event: string,
  payload: any,
) {
  try {
    const io = (globalThis as any).__fixmate_io;
    if (!io || typeof io.to !== "function") return;
    io.to(`ticket:${ticketId}`).emit(event, payload);
  } catch {
    // never block API responses on realtime
  }
}

export function emitCallRequestUpdate(ticketId: string, callRequest: any) {
  emitToTicketRoom(ticketId, "call_request:update", { callRequest });
}
