// src/hooks/useOfflineQueueSync.tsx
import { useEffect } from "react";
import { getQueue, processQueueOnce } from "../offline/operationQueue";
import { useToast } from "../contexts/ToastContext";

export function useOfflineQueueSync() {
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;

    const runSync = async (reason: string) => {
      if (cancelled) return;

      const before = getQueue().length;
      if (before === 0) return;

      try {
        await processQueueOnce();
        if (cancelled) return;

        const after = getQueue().length;
        const processed = before - after;

        if (processed > 0) {
          showToast(
            `Synced ${processed} pending action${processed > 1 ? "s" : ""} (${reason}).`,
            { variant: "success" }
          );
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error processing offline queue", err);
        }
      }
    };

    // 1) Try once on startup
    runSync("startup");

    // 2) Try every 30 seconds in the background
    const intervalId = window.setInterval(() => runSync("background"), 30_000);

    // 3) Try again whenever the browser detects we're online
    const handleOnline = () => runSync("connection restored");
    window.addEventListener("online", handleOnline);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("online", handleOnline);
    };
  }, [showToast]);
}
