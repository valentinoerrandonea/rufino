"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * When the processor is running, poll every 5 seconds to refresh the page.
 * When the lockfile is gone, the next refresh will hide this poller.
 */
export function ProcessingPoller({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
