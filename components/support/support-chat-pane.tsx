import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SupportMessageComposer } from "./support-message-composer";
import { SupportMessageThread } from "./support-message-thread";
import { Msg, Ticket } from "./support-types";

function shortId(id: string) {
  return id?.slice(0, 8) ?? id;
}

export function SupportChatPane({
  ticket,
  messages,
  messageBody,
  onMessageBodyChange,
  onSendMessage,
  onRefresh,
  refreshing,
  sendingMessage,
  socketConnected,
  joined,
  lastError,
  scrollAreaRef,
  billingLabel,
  incidentLabel,
  compact = false,
}: {
  ticket: Ticket;
  messages: Msg[];
  messageBody: string;
  onMessageBodyChange: (value: string) => void;
  onSendMessage: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  sendingMessage: boolean;
  socketConnected: boolean;
  joined: boolean;
  lastError?: string | null;
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
  billingLabel: string;
  incidentLabel: string;
  compact?: boolean;
}) {
  const connectionLabel = socketConnected
    ? joined
      ? "Realtime connected"
      : "Connecting to ticket room…"
    : `Realtime disconnected (REST fallback enabled)${
        lastError ? ` • ${lastError}` : ""
      }`;

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader
        className={cn(
          "shrink-0 border-b bg-background/80",
          compact ? "px-4 py-3" : "",
        )}
      >
        <div className="flex items-start justify-between gap-3">
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
              <span>{ticket.status.replaceAll("_", " ")}</span>
              <span>{billingLabel}</span>
              <span>Incident: {incidentLabel}</span>
              <span>{connectionLabel}</span>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={onRefresh}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <SupportMessageThread
          messages={messages}
          scrollAreaRef={scrollAreaRef}
        />

        <SupportMessageComposer
          value={messageBody}
          onChange={onMessageBodyChange}
          onSend={onSendMessage}
          disabled={sendingMessage}
          sending={sendingMessage}
        />
      </CardContent>
    </Card>
  );
}
