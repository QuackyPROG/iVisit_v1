import { useEffect, useState } from "react";
import { getScannerStatus, type ScannerStatus } from "../../api/HelperApi";

type StatusKind = "unknown" | "helper-offline" | "scanner-ok" | "scanner-error";

interface DerivedStatus {
  kind: StatusKind;
  label: string;
  detail?: string;
}

interface HelperStatusBadgeProps {
  pollMs?: number;
}

export default function HelperStatusBadge({ pollMs = 8000 }: HelperStatusBadgeProps) {
  const [status, setStatus] = useState<DerivedStatus>({
    kind: "unknown",
    label: "Checking helper…",
  });

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    const tick = async () => {
      try {
        const result: ScannerStatus | null = await getScannerStatus();
        if (cancelled) return;

        if (!result) {
          // Helper app itself unreachable
          setStatus({
            kind: "helper-offline",
            label: "Helper offline",
            detail: "Cannot reach helper app on this station.",
          });
        } else if (result.ok) {
          const firstReader = result.readerNames?.[0];
          setStatus({
            kind: "scanner-ok",
            label: "RFID ready",
            detail: firstReader
              ? `Reader: ${firstReader}`
              : result.message || "RFID scanner connected.",
          });
        } else {
          // Helper reachable but scanner unhappy (e.g. list() failed)
          setStatus({
            kind: "scanner-error",
            label: "RFID error",
            detail: result.message || "RFID scanner not working properly.",
          });
        }
      } catch (err: any) {
        if (cancelled) return;
        setStatus({
          kind: "helper-offline",
          label: "Helper offline",
          detail: err?.message || "Cannot reach helper app.",
        });
      } finally {
        if (!cancelled) {
          timeoutId = window.setTimeout(tick, pollMs);
        }
      }
    };

    // initial ping
    tick();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [pollMs]);

  let colorClasses =
    "border-gray-500/60 text-gray-300 bg-gray-800/60";

  if (status.kind === "scanner-ok") {
    colorClasses = "border-green-400/70 text-green-200 bg-green-700/20";
  } else if (status.kind === "scanner-error") {
    colorClasses = "border-amber-400/70 text-amber-200 bg-amber-700/20";
  } else if (status.kind === "helper-offline") {
    colorClasses = "border-red-400/70 text-red-200 bg-red-800/30";
  }

  return (
    <div
      className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${colorClasses}`}
      title={status.detail || status.label}
    >
      {/* Little status dot */}
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          status.kind === "scanner-ok"
            ? "bg-green-400"
            : status.kind === "scanner-error"
            ? "bg-amber-400"
            : status.kind === "helper-offline"
            ? "bg-red-400"
            : "bg-gray-400"
        }`}
      />
      <span>Helper / RFID:</span>
      <span className="truncate max-w-[9rem]">{status.label}</span>
    </div>
  );
}
