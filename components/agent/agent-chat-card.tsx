"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AgentTicket, Msg, formatTs, shortId } from "./agent-console-types";

export function AgentChatCard({
  ticket,
  messages,
  messageBody,
  onMessageBodyChange,
  onSendMessage,
  socketConnected,
  joined,
  sendingMessage,
  chatScrollRef,
  billingLabel,
  incidentLabel,
  compact = false,
}: {
  ticket: AgentTicket;
  messages: Msg[];
  messageBody: string;
  onMessageBodyChange: (value: string) => void;
  onSendMessage: () => void;
  socketConnected: boolean;
  joined: boolean;
  sendingMessage: boolean;
  chatScrollRef: React.RefObject<HTMLDivElement | null>;
  billingLabel: string;
  incidentLabel: string;
  compact?: boolean;
}) {
  const connectionLabel = socketConnected
    ? joined
      ? "Realtime connected"
      : "Connecting to ticket room…"
    : "Realtime disconnected (REST fallback enabled)";

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader
        className={cn(
          "shrink-0 border-b bg-background/80",
          compact ? "px-4 py-3" : "",
        )}
      >
        <div className="min-w-0">
          <CardTitle className="truncate text-lg">{ticket.subject}</CardTitle>

          {!compact ? (
            ticket.description ? (
              <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {ticket.description}
              </div>
            ) : (
              <div className="mt-1 text-sm text-muted-foreground">
                Keep the full ticket conversation here.
              </div>
            )
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>#{shortId(ticket.id)}</span>
            <span>{ticket.agent_alias}</span>
            <span>{ticket.status.replaceAll("_", " ")}</span>
            <span>{billingLabel}</span>
            <span>Incident: {incidentLabel}</span>
            <span>{connectionLabel}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div
          ref={chatScrollRef}
          className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5"
        >
          {messages.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No messages yet. Start the conversation below.
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.sender_role === "customer"
                      ? "justify-start"
                      : "justify-end"
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      m.sender_role === "customer"
                        ? "border bg-muted/40"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {m.body}
                    </div>
                    <div className="mt-2 text-[11px] opacity-70">
                      {formatTs(m)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t bg-background/95 p-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Type a message…"
              value={messageBody}
              onChange={(e) => onMessageBodyChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSendMessage();
                }
              }}
              className="flex-1"
              disabled={sendingMessage}
            />
            <Button onClick={onSendMessage} disabled={sendingMessage}>
              {sendingMessage ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
