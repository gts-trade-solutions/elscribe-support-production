const { Server } = require("socket.io");
const { query, exec } = require("./socket-db");
const { randomUUID } = require("crypto");
const { jwtVerify } = require("jose");

const UUIDISH_RE = /^[0-9a-fA-F-]{10,}$/;

async function verifySocketAuthToken(raw) {
  if (!raw || typeof raw !== "string") return null;
  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) return null;
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(raw, key, { algorithms: ["HS256"] });
    if (payload?.purpose !== "socket_auth") return null;
    if (!payload?.uid) return null;
    return {
      uid: String(payload.uid),
      role: payload.role || "customer",
      accountId: payload.accountId ?? null,
      accountType: payload.accountType ?? null,
      membershipRole: payload.membershipRole ?? null,
    };
  } catch {
    return null;
  }
}

async function getAuthedTokenFromReq(req) {
  // next-auth/jwt is ESM-friendly; dynamic import keeps this file CommonJS.
  const mod = await import("next-auth/jwt");
  const getToken = mod.getToken;
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  const token = await getToken({ req, secret, secureCookie: false });
  if (!token || !token.uid) return null;

  return {
    uid: String(token.uid),
    role: token.role || "customer",
    accountId: token.accountId ?? null,
    accountType: token.accountType ?? null,
    membershipRole: token.membershipRole ?? null,
  };
}

async function canAccessTicket({ ticketId, token }) {
  if (!ticketId || !UUIDISH_RE.test(ticketId))
    return { ok: false, code: "bad_ticket_id" };
  if (!token?.uid) return { ok: false, code: "unauthorized" };

  if (token.role === "customer") {
    if (!token.accountId) return { ok: false, code: "no_account" };
    const isOwner = token.membershipRole === "owner";
    const rows = await query(
      `SELECT id FROM tickets
        WHERE id = ? AND account_id = ?
          ${isOwner ? "" : "AND created_by_user_id = ?"}
        LIMIT 1`,
      isOwner
        ? [ticketId, token.accountId]
        : [ticketId, token.accountId, token.uid],
    );
    return rows[0] ? { ok: true } : { ok: false, code: "not_found" };
  }

  if (token.role === "agent") {
    const rows = await query(
      `SELECT assigned_agent_id FROM tickets WHERE id = ? LIMIT 1`,
      [ticketId],
    );
    if (!rows[0]) return { ok: false, code: "not_found" };
    const assigned = rows[0].assigned_agent_id;
    if (assigned && String(assigned) !== String(token.uid)) {
      return { ok: false, code: "assigned_to_other_agent" };
    }
    return { ok: true };
  }

  // admin
  return { ok: true };
}

async function createAuditLog({
  actorUserId,
  actorRole,
  action,
  entityType,
  entityId,
  metadata,
}) {
  try {
    const id = randomUUID();
    await exec(
      `INSERT INTO audit_logs (id, actor_user_id, actor_role, action, entity_type, entity_id, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        actorUserId,
        actorRole,
        action,
        entityType,
        entityId,
        JSON.stringify(metadata || {}),
      ],
    );
  } catch (e) {
    // Audit logs must never break chat
    console.warn("[socket][audit] failed:", e?.message || e);
  }
}

async function insertMessage({ ticketId, senderRole, senderUserId, body }) {
  const id = randomUUID();
  await exec(
    `INSERT INTO ticket_messages (id, ticket_id, sender_role, sender_user_id, body)
     VALUES (?, ?, ?, ?, ?)`,
    [id, ticketId, senderRole, senderUserId, body],
  );

  // Always return the DB timestamp (not app server time) so refresh matches.
  const rows = await query(
    `SELECT (UNIX_TIMESTAMP(created_at) * 1000) AS createdAtMs
     FROM ticket_messages
     WHERE id = ?
     LIMIT 1`,
    [id],
  );
  const createdAtMs = rows?.[0]?.createdAtMs
    ? Number(rows[0].createdAtMs)
    : Date.now();

  // Transport shape is snake_case to match existing UI.
  return {
    id,
    ticket_id: ticketId,
    sender_role: senderRole,
    sender_user_id: senderUserId,
    body,
    created_at_ms: createdAtMs,
    created_at: new Date(createdAtMs).toISOString(),
  };
}

/**
 * Creates and attaches a Socket.IO server to the provided HTTP server.
 * Part 8: Auth + rooms + persistence + authorization.
 */
function createSocketServer(httpServer, { dev }) {
  const appUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL;

  // Allow a comma-separated list of origins in production.
  const allowOrigins = appUrl
    ? String(appUrl)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      // In dev, accept any origin.
      // In production, accept APP_URL origins if provided, otherwise fall back to reflecting origin.
      origin: dev ? true : allowOrigins.length ? allowOrigins : true,
      credentials: true,
    },
  });

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      // Prefer explicit short-lived auth token minted by /api/socket/token
      const handshakeToken = socket.handshake?.auth?.token;
      const fromHandshake = await verifySocketAuthToken(handshakeToken);
      if (fromHandshake) {
        socket.data.token = fromHandshake;
        return next();
      }

      // Fallback to NextAuth cookie token (may fail in some environments)
      const token = await getAuthedTokenFromReq(socket.request);
      if (!token) return next(new Error("UNAUTHORIZED"));
      socket.data.token = token;
      return next();
    } catch (e) {
      return next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.emit("server:hello", {
      ok: true,
      socketId: socket.id,
      role: socket.data?.token?.role,
    });

    // Join a ticket room (ticket:<id>)
    socket.on("ticket:join", async (payload, ack) => {
      const ticketId = String(payload?.ticketId || "").trim();
      const token = socket.data?.token;

      try {
        const access = await canAccessTicket({ ticketId, token });
        if (!access.ok) {
          if (typeof ack === "function") ack({ ok: false, error: access.code });
          return;
        }

        const room = `ticket:${ticketId}`;
        socket.join(room);
        if (typeof ack === "function") ack({ ok: true });
      } catch (e) {
        if (typeof ack === "function")
          ack({ ok: false, error: "server_error" });
      }
    });

    // Send a message (persist + broadcast)
    socket.on("message:send", async (payload, ack) => {
      const ticketId = String(payload?.ticketId || "").trim();
      const body = String(payload?.body || "").trim();
      const token = socket.data?.token;

      try {
        if (!body || body.length > 5000) {
          if (typeof ack === "function")
            ack({ ok: false, error: "invalid_body" });
          return;
        }

        const access = await canAccessTicket({ ticketId, token });
        if (!access.ok) {
          if (typeof ack === "function") ack({ ok: false, error: access.code });
          return;
        }

        const msg = await insertMessage({
          ticketId,
          senderRole: token.role,
          senderUserId: token.uid,
          body,
        });

        const room = `ticket:${ticketId}`;
        io.to(room).emit("message:new", { message: msg });

        await createAuditLog({
          actorUserId: token.uid,
          actorRole: token.role,
          action: "ticket.message.create",
          entityType: "ticket",
          entityId: ticketId,
          metadata: { messageId: msg.id, via: "socket" },
        });

        if (typeof ack === "function") ack({ ok: true, message: msg });
      } catch (e) {
        console.warn("[socket] message:send failed:", e?.message || e);
        if (typeof ack === "function")
          ack({ ok: false, error: "server_error" });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

module.exports = { createSocketServer };
