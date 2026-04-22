"use client";

import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CopyableScriptBlock({
  label,
  defaultValue,
  hint,
  rows = 5,
  copyToast = "Message copied.",
}: {
  label: string;
  defaultValue: string;
  hint?: string;
  rows?: number;
  copyToast?: string;
}) {
  const [value, setValue] = useState(defaultValue);

  // Re-sync when defaultValue changes (e.g. handoff script with the new
  // link URL on a second generate). Preserve manual edits by only resetting
  // when the default itself changes.
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(copyToast);
    } catch {
      toast.error("Copy failed — copy the text manually.");
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={rows}
        className="font-mono text-sm"
      />
      <div className="flex items-center justify-between gap-2">
        {hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : (
          <span />
        )}
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          <Copy className="mr-2 h-4 w-4" />
          Copy message
        </Button>
      </div>
    </div>
  );
}

export default CopyableScriptBlock;
