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
      title="Could not load agent queue"
      description="There was a problem loading the queue."
      reset={reset}
    />
  );
}
