"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ACTIVE_KEY = "__guest_postpay_active";

export function useGuestPostpayHint() {
  const { data: session, status } = useSession();
  const isGuest = Boolean((session?.user as any)?.isGuest);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !isGuest) {
      setActive(false);
      return;
    }
    try {
      setActive(sessionStorage.getItem(ACTIVE_KEY) === "1");
    } catch {
      setActive(false);
    }
  }, [status, isGuest]);

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(ACTIVE_KEY);
    } catch {
      // ignore
    }
    setActive(false);
  }, []);

  return { active, clear };
}

export function GuestPostpayHint({
  active,
  onDismiss,
}: {
  active: boolean;
  onDismiss: () => void;
}) {
  if (!active) return null;
  return (
    <Card className="border-emerald-300 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <div className="text-base font-semibold text-emerald-900 dark:text-emerald-100">
              Payment received — you&apos;re all set.
            </div>
            <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-100/80">
              Your agent is waiting. Click{" "}
              <span className="font-medium">Continue support</span> above, or
              use the{" "}
              <span className="font-medium">Open support workspace</span>{" "}
              button on the right, to start chatting and get this resolved.
            </p>
          </div>
        </div>
        <div className="sm:shrink-0">
          <Button variant="outline" size="sm" onClick={onDismiss}>
            Got it
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default GuestPostpayHint;
