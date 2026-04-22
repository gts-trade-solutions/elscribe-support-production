"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertTriangle, Clock, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "__guest_banner_dismissed";
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

function formatRemaining(ms: number) {
  if (ms <= 0) return "0m";
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export function GuestSessionBanner() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [now, setNow] = useState<number>(() => Date.now());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") {
        setDismissed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const isGuest = Boolean((session?.user as any)?.isGuest);
  const sessionExpiresAt = (session?.user as any)?.sessionExpiresAt as
    | string
    | null
    | undefined;

  const expMs = useMemo(() => {
    if (!sessionExpiresAt) return null;
    const t = new Date(sessionExpiresAt).getTime();
    return Number.isFinite(t) ? t : null;
  }, [sessionExpiresAt]);

  const remainingMs = expMs != null ? expMs - now : null;

  if (status !== "authenticated" || !isGuest) return null;

  // Don't show on the ticket-link landing itself — the page has its own
  // countdown banner built in.
  if (pathname.startsWith("/ticket-link")) return null;

  const isExpired = remainingMs != null && remainingMs <= 0;
  const isUrgent =
    remainingMs != null && remainingMs > 0 && remainingMs <= SIX_HOURS_MS;
  const isSoft = remainingMs != null && remainingMs > SIX_HOURS_MS;

  const convertHref = "/convert-account";

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  if (isSoft && dismissed) return null;

  if (isExpired) {
    return (
      <div className="border-b border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
        <div className="container flex flex-col gap-2 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Your guest session has expired. Create an account to restore
              access — or ask your agent to extend the link.
            </span>
          </div>
          <div className="flex gap-2 self-start sm:self-auto">
            <Button asChild size="sm" variant="default">
              <Link href={convertHref}>
                <UserPlus className="mr-2 h-4 w-4" />
                Create account
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isUrgent) {
    return (
      <div className="border-b border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
        <div className="container flex flex-col gap-2 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Your guest session ends in{" "}
              <span className="font-semibold">
                {formatRemaining(remainingMs ?? 0)}
              </span>
              . Create an account now to avoid losing access to this ticket.
            </span>
          </div>
          <div className="flex gap-2 self-start sm:self-auto">
            <Button asChild size="sm">
              <Link href={convertHref}>
                <UserPlus className="mr-2 h-4 w-4" />
                Create account
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Soft state (>6h left, or no expiry known yet but isGuest=true)
  return (
    <div className="border-b bg-muted/50 text-foreground">
      <div className="container flex flex-col gap-2 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-muted-foreground">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            You&apos;re using a temporary guest session
            {remainingMs != null ? (
              <>
                {" "}
                — it ends in{" "}
                <span className="font-medium text-foreground">
                  {formatRemaining(remainingMs)}
                </span>
              </>
            ) : null}
            . Create an account to keep access after that.
          </span>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button asChild size="sm" variant="default">
            <Link href={convertHref}>
              <UserPlus className="mr-2 h-4 w-4" />
              Create account
            </Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss}>
            <X className="mr-2 h-4 w-4" />
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
