import { randomUUID } from "crypto";
import { exec } from "@/lib/db";

export type ScreenShareStatus = "started" | "stopped";

export async function logScreenShareEvent(opts: {
  ticketId: string;
  status: ScreenShareStatus;
}) {
  const id = randomUUID();
  await exec(
    `INSERT INTO screen_share_events (id, ticket_id, status)
     VALUES (?, ?, ?)`,
    [id, opts.ticketId, opts.status],
  );
  return { id, ticketId: opts.ticketId, status: opts.status };
}
