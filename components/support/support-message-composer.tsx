import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SupportMessageComposer({
  value,
  onChange,
  onSend,
  disabled,
  sending,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  sending?: boolean;
}) {
  return (
    <div className="shrink-0 border-t bg-background/95 p-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Type a message…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          className="flex-1"
          disabled={disabled}
        />
        <Button onClick={onSend} disabled={disabled}>
          {sending ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
}
