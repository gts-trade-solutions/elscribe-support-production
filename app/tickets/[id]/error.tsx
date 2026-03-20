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
      title="Could not load ticket"
      description="There was a problem loading this ticket."
      reset={reset}
    />
  );
}
