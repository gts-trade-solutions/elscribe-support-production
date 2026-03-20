import { ScrollArea } from "@/components/ui/scroll-area";
import { Msg, formatTs } from "./support-types";

export function SupportMessageThread({
  messages,
  scrollAreaRef,
}: {
  messages: Msg[];
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="min-h-0 flex-1">
      <ScrollArea ref={scrollAreaRef} className="h-full w-full">
        <div className="space-y-4 p-4 sm:p-6">
          {messages.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No messages yet. Start the conversation below.
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${
                  m.sender_role === "customer" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-3 sm:max-w-[82%] ${
                    m.sender_role === "customer"
                      ? "bg-primary text-primary-foreground"
                      : "border bg-muted/40"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {m.body}
                  </p>
                  <div className="mt-2 text-[11px] opacity-70">
                    {formatTs(m)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
