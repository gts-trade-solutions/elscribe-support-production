import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, User } from "lucide-react";
import { AgentTicket, shortId } from "./agent-console-types";

export function AgentTicketSummary({ ticket }: { ticket: AgentTicket }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono">
                #{shortId(ticket.id)}
              </Badge>

              <Badge
                variant={
                  ticket.priority === "high" || ticket.priority === "critical"
                    ? "destructive"
                    : "default"
                }
                className="capitalize"
              >
                {ticket.priority}
              </Badge>

              <Badge
                variant={
                  ticket.status === "open"
                    ? "destructive"
                    : ticket.status === "resolved" || ticket.status === "closed"
                      ? "secondary"
                      : "default"
                }
              >
                {ticket.status.replaceAll("_", " ")}
              </Badge>
            </div>

            <div className="truncate text-lg font-semibold">
              {ticket.subject}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{ticket.agent_alias}</span>
              </div>

              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  Updated {new Date(ticket.updated_at).toLocaleString()}
                </span>
              </div>

              <span>{ticket.category || "General"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4">
          <div className="mb-1 text-sm font-medium">Reported issue</div>
          <div className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
            {ticket.description || "(No description)"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
