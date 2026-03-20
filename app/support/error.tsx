"use client";

import { RouteError } from "@/components/route-error";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      title="Could not load support session"
      description="There was a problem loading the support workspace for this ticket."
      reset={reset}
    />
  );
}
