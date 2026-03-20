import { exec, query } from "@/lib/db";
import { livekitRoomNameForTicket } from "@/lib/livekit/server";

export type MediaRoomRow = {
  ticketId: string;
  provider: string;
  roomName: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapRow(r: any): MediaRoomRow {
  return {
    ticketId: String(r.ticket_id),
    provider: String(r.provider),
    roomName: String(r.room_name),
    active: Boolean(r.active),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : "",
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : "",
  };
}

export async function ensureLiveKitRoomActive(ticketId: string) {
  const roomName = livekitRoomNameForTicket(ticketId);

  await exec(
    `INSERT INTO media_rooms (ticket_id, provider, room_name, active)
     VALUES (?, 'livekit', ?, 1)
     ON DUPLICATE KEY UPDATE
       provider = VALUES(provider),
       room_name = VALUES(room_name),
       active = 1,
       updated_at = NOW()`,
    [ticketId, roomName],
  );

  const rows = await query<any>(
    `SELECT ticket_id, provider, room_name, active, created_at, updated_at
     FROM media_rooms
     WHERE ticket_id = ?
     LIMIT 1`,
    [ticketId],
  );

  return rows[0] ? mapRow(rows[0]) : null;
}

export async function setMediaRoomActive(ticketId: string, active: boolean) {
  await exec(
    `UPDATE media_rooms
        SET active = ?, updated_at = NOW()
      WHERE ticket_id = ?`,
    [active ? 1 : 0, ticketId],
  );
}
