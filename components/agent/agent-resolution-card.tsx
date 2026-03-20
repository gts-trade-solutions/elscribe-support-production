import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  TicketPriority,
  TicketStatus,
} from "./agent-console-types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AgentResolutionCard({
  status,
  priority,
  onStatusChange,
  onPriorityChange,
  onSave,
  saving,
  currentStatus,
  currentPriority,
  compact = false,
}: {
  status: TicketStatus;
  priority: TicketPriority;
  onStatusChange: (value: TicketStatus) => void;
  onPriorityChange: (value: TicketPriority) => void;
  onSave: () => void;
  saving: boolean;
  currentStatus?: TicketStatus;
  currentPriority?: TicketPriority;
  compact?: boolean;
}) {
  const nothingChanged =
    status === currentStatus && priority === (currentPriority ?? "medium");

  return (
    <Card>
      <CardHeader className={cn(compact ? "px-4 py-3" : "")}>
        <CardTitle className="text-lg">Resolution controls</CardTitle>
      </CardHeader>

      <CardContent className={cn("space-y-4", compact ? "px-4 pb-4 pt-0" : "")}>
        <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
          Current ticket status:{" "}
          <span className="font-medium text-foreground">
            {currentStatus?.replaceAll("_", " ") || "unknown"}
          </span>
          <div className="mt-1">
            Current priority:{" "}
            <span className="font-medium text-foreground">
              {currentPriority || "medium"}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Status</div>

          <Select
            value={status}
            onValueChange={(v: TicketStatus) => onStatusChange(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Priority</div>

          <Select
            value={priority}
            onValueChange={(v: TicketPriority) => onPriorityChange(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!compact ? (
            <div className="text-xs text-muted-foreground">
              Priority is owned by support operations and can be updated only by
              agents or admins.
            </div>
          ) : null}
        </div>

        <Button
          className="w-full"
          onClick={onSave}
          disabled={saving || nothingChanged}
        >
          {saving ? "Saving…" : "Save controls"}
        </Button>
      </CardContent>
    </Card>
  );
}
