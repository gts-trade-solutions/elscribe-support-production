import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CallReq } from "./agent-console-types";

export function PendingCallCard({
  callReq,
  onAccept,
  accepting,
  compact = false,
}: {
  callReq: CallReq | null;
  onAccept: () => void;
  accepting: boolean;
  compact?: boolean;
}) {
  if (!callReq) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className={cn(compact ? "px-4 py-3" : "")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Pending live escalation</CardTitle>
            <CardDescription>
              Customer requested a{" "}
              <span className="font-semibold">{callReq.type}</span> escalation.
            </CardDescription>
          </div>

          <Badge variant="outline">{callReq.status}</Badge>
        </div>
      </CardHeader>

      <CardContent className={cn(compact ? "px-4 pb-4 pt-0" : "")}>
        <div className="mb-4 text-sm text-muted-foreground">
          Created {new Date(callReq.createdAt).toLocaleString()}
        </div>

        <Button className="w-full" onClick={onAccept} disabled={accepting}>
          {accepting ? `Accepting ${callReq.type}…` : `Accept ${callReq.type}`}
        </Button>
      </CardContent>
    </Card>
  );
}
