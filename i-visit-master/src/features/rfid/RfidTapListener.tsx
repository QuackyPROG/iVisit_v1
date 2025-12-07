// src/features/rfid/RfidTapListener.tsx
import { useState, useEffect, useRef } from "react";
import { useCookies } from "react-cookie";
import Button from "../../components/common/Button";
import { useToast } from "../../contexts/ToastContext";
import { readCardUID } from "../../hooks/readCard";
import { useRfidPollingControl } from "./RfidPollingContext";

import {
  getPassByUid,
  getActiveLogs,
  recordLogEntryResilient,
  endVisitorLogResilient,
  revokePassFromLog,
  type VisitorLogDTO,
  getAllPasses,
  type VisitorPass,
} from "../../api/Index";

type Role = "guard" | "admin" | "support";

interface RfidTapListenerProps {
  role: Role;
  stationId: number | null;
  stationName: string | null;
  stationType: string | null;
  enablePolling?: boolean;
  showButton?: boolean;
}

export default function RfidTapListener({
  role,
  stationId,
  stationName,
  stationType,
  enablePolling = true,
  showButton = false,
}: RfidTapListenerProps) {
  const { showToast } = useToast();
  const [cookies] = useCookies(["userId"]);
  const [busy, setBusy] = useState(false);

  const { pollingEnabled } = useRfidPollingControl();
  const pollingBusyRef = useRef(false);
  const lastUidRef = useRef<string | null>(null);
  const lastUidAtRef = useRef<number>(0);

  const [cachedPasses, setCachedPasses] = useState<VisitorPass[] | null>(null);
  const [cachedActiveLogs, setCachedActiveLogs] = useState<VisitorLogDTO[] | null>(null);

  if (role !== "guard") return null;

  const userIdRaw = cookies.userId;
  const currentUserId =
    typeof userIdRaw === "number"
      ? userIdRaw
      : userIdRaw != null
        ? Number.parseInt(String(userIdRaw), 10)
        : null;

  const isGateStation =
    stationType != null && stationType.toUpperCase() === "GATE";

  const disabledReason =
    !stationId
      ? "No station linked to this device."
      : !currentUserId
        ? "No guard account ID found."
        : !stationName
          ? "Station information is not loaded yet."
          : null;

  useEffect(() => {
    let cancelled = false;

    const refreshSnapshots = async () => {
      if (!navigator.onLine) return;
      if (cancelled) return;

      try {
        const [passes, activeLogs] = await Promise.all([
          getAllPasses(),
          getActiveLogs(),
        ]);

        if (cancelled) return;

        setCachedPasses(passes);
        setCachedActiveLogs(activeLogs);
      } catch (err) {
        console.error("Failed to refresh RFID snapshots", err);
      }
    };

    // initial fetch
    refreshSnapshots();

    // refresh every 30s
    const id = window.setInterval(refreshSnapshots, 30_000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const getPassLabelFromPass = (pass: VisitorPass): string => {
    const rawDisplay = (pass as any).displayCode as string | undefined;
    const rawNumber = (pass as any).passNumber as string | undefined;

    const display = rawDisplay && rawDisplay.trim();
    const number = rawNumber && rawNumber.trim();

    if (display) return display;
    if (number) return number;
    return `P-${pass.passID}`;
  };

  const findPassOfflineByUid = (
    uid: string,
    passes: VisitorPass[] | null
  ): VisitorPass | null => {
    if (!uid || !passes || passes.length === 0) return null;

    const normalizedUid = uid.trim().toUpperCase();

    const byExternalId = passes.find(
      (p) => (p as any).visitorPassID === uid
    );

    const byPassNumber = passes.find((p) => {
      const num =
        ((p as any).passNumber ??
          (p as any).pass_number ??
          "").toString().toUpperCase();
      return num === normalizedUid;
    });

    const pass = byExternalId ?? byPassNumber ?? null;
    if (!pass) return null;

    const rawStatus = (pass as any).status as string | undefined;
    const status = rawStatus ? rawStatus.trim().toUpperCase() : "AVAILABLE";

    if (status === "LOST" || status === "INACTIVE" || status === "RETIRED") {
      return null;
    }

    return pass;
  };

  const resolveActiveLogForPass = (
    activeLogs: VisitorLogDTO[],
    passLabel: string
  ): VisitorLogDTO | undefined => {
    return activeLogs.find((log) => log.passNo === passLabel);
  };

  type Source = "poll" | "manual";

  const handleCardUid = async (uid: string, source: Source) => {
    if (!stationId || !currentUserId) {
      if (source === "manual") {
        showToast(
          "Missing station or guard info. Please sign in and link a station.",
          { variant: "error" }
        );
      }
      return;
    }

    if (!stationName || !stationName.trim()) {
      if (source === "manual") {
        showToast(
          "Station information is still loading. Please wait a moment or use \"Check Log\" -> \"Log Here\" as a manual override.",
          { variant: "error" }
        );
      }
      return;
    }

    let pass: VisitorPass | null = null;

    if (navigator.onLine) {
      try {
        pass = await getPassByUid(uid);
      } catch (err: any) {
        if (source === "manual") {
          showToast(
            err?.message ||
            "This card is not registered as a visitor pass in the system.",
            { variant: "error" }
          );
        }
        return;
      }
    } else {
      pass = findPassOfflineByUid(uid, cachedPasses);
      if (!pass) {
        if (source === "manual") {
          showToast(
            "This card is not recognized in the cached pass list. Try again when online.",
            { variant: "warning" }
          );
        }
        return;
      }
    }

    const passLabel = getPassLabelFromPass(pass);

    let activeLogs: VisitorLogDTO[] = [];

    if (navigator.onLine) {
      activeLogs = await getActiveLogs();
    } else {
      if (!cachedActiveLogs || cachedActiveLogs.length === 0) {
        if (source === "manual") {
          showToast(
            "No cached active log data available offline. Try again when network is restored.",
            { variant: "warning" }
          );
        }
        return;
      }
      activeLogs = cachedActiveLogs;
    }

    const log = resolveActiveLogForPass(activeLogs, passLabel);

    if (!log) {
      if (source === "manual") {
        showToast(
          `No active visitor log is linked to pass ${passLabel}. Use Log Visitor -> Check Log for manual handling.`,
          { variant: "warning" }
        );
      }
      return;
    }

    // --- RFID-only allowed-stations enforcement (both gates and buildings) ---
    // "Log Here" uses a different path and remains a manual override.
    const stationNameNormalized = (stationName || "").trim().toLowerCase();

    const allowedOriginal = log.allowedStations || [];
    const allowedNormalized = allowedOriginal
      .map((n) => (n || "").trim().toLowerCase())
      .filter((n) => n.length > 0);

    const isAllowedHere =
      stationNameNormalized.length > 0 &&
      allowedNormalized.length > 0 &&
      allowedNormalized.includes(stationNameNormalized);

    console.log("RFID DEBUG", {
      stationName,
      stationNameNormalized,
      allowedOriginal,
      allowedNormalized,
      isGateStation,
      fullName: log.fullName,
      visitorLogID: log.visitorLogID,
      isAllowedHere,
    });

    if (!isAllowedHere) {
      if (source === "poll") {
        const locationLabel =
          stationName || (isGateStation ? "this gate" : "this station");

        if (allowedNormalized.length === 0) {
          // no allowed stations configured at all
          const msg = isGateStation
            ? `Visitor ${log.fullName} is denied at ${locationLabel}. \nNo exit gates are assigned for this visit.`
            : `Visitor ${log.fullName} is denied at ${locationLabel}. \nNo allowed stations are assigned for this visit.`;

          showToast(msg, { variant: "error" });
        } else {
          // heuristic split to categorize names
          const allowedGates = allowedOriginal.filter((n) =>
            (n || "").toLowerCase().includes("gate")
          );
          const allowedNonGates = allowedOriginal.filter(
            (n) => !(n || "").toLowerCase().includes("gate")
          );

          let contextList: string[];

          if (isGateStation) {
            // at a gate -> want gate-only list
            contextList =
              allowedGates.length > 0 ? allowedGates : allowedOriginal;
          } else {
            // at a building -> want non-gate list
            contextList =
              allowedNonGates.length > 0 ? allowedNonGates : allowedOriginal;
          }

          const allowedForContext = contextList.join(", ");

          // contextual wording:
          const msg = isGateStation
            ? `Visitor ${log.fullName} is denied at ${locationLabel}. \nCan only exit at: ${allowedForContext}.`
            : `Visitor ${log.fullName} is denied at ${locationLabel}. \nCan only go to: ${allowedForContext}.`;

          showToast(msg, { variant: "error" });
        }
      }

      return;
    }

    if (!isGateStation) {
      const result = await recordLogEntryResilient({
        visitorLogId: log.visitorLogID,
        stationId,
        accountId: currentUserId,
      });

      const wasQueued =
        typeof result === "object" &&
        result !== null &&
        "queued" in result &&
        (result as any).queued === true;

      if (source === "manual" || !wasQueued) {
        if (wasQueued) {
          showToast(
            `Network issue – movement for ${log.fullName} has been queued and will sync once connection is restored.`,
            { variant: "warning" }
          );
        } else {
          showToast(
            `Movement recorded at ${stationName ?? "this station"
            } for ${log.fullName}.`,
            { variant: "success" }
          );
        }
      }

      return;
    }

    let wasQueued = false;

    const movementRes = await recordLogEntryResilient({
      visitorLogId: log.visitorLogID,
      stationId,
      accountId: currentUserId,
    });

    if (
      typeof movementRes === "object" &&
      movementRes !== null &&
      "queued" in movementRes &&
      (movementRes as any).queued === true
    ) {
      wasQueued = true;
    }

    const endRes = await endVisitorLogResilient({
      logId: log.visitorLogID,
      stationId,
      guardAccountId: currentUserId,
    });

    if (
      typeof endRes === "object" &&
      endRes !== null &&
      "queued" in endRes &&
      (endRes as any).queued === true
    ) {
      wasQueued = true;
    }

    try {
      if (!wasQueued) {
        await revokePassFromLog(log.visitorLogID);
      }
    } catch (err: any) {
      if (source === "manual") {
        showToast(
          err?.message ||
          "Visitor log ended, but pass revocation failed. Please verify pass inventory.",
          { variant: "error" }
        );
      }
    }

    if (source === "manual" || !wasQueued) {
      if (wasQueued) {
        showToast(
          `Exit for ${log.fullName} at ${stationName ?? "gate"
          } has been queued due to network issues. Please verify log and pass status once online.`,
          { variant: "warning" }
        );
      } else {
        showToast(
          `Visitor ${log.fullName} exited at ${stationName ?? "gate"
          }. Pass revoked and log closed. Please collect the pass.`,
          { variant: "success" }
        );
      }
    }
  };

  const handleTap = async () => {
    if (busy) return;
    setBusy(true);

    try {
      const readResult = await readCardUID();
      if (!readResult.success || !readResult.uid) {
        showToast(
          readResult.message ||
          "No card detected. Please tap a visitor pass on the reader.",
          { variant: "warning" }
        );
        return;
      }
      await handleCardUid(readResult.uid, "manual");
    } catch (err: any) {
      console.error("RFID tap flow failed:", err);
      showToast(err?.message || "RFID tap failed unexpectedly.", {
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const pollingActive = enablePolling && !disabledReason && pollingEnabled;

  useEffect(() => {
    if (!pollingActive) return;

    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      if (pollingBusyRef.current) return;

      pollingBusyRef.current = true;
      try {
        const result = await readCardUID();
        if (!result.success || !result.uid) return;

        const now = Date.now();
        if (
          result.uid === lastUidRef.current &&
          now - lastUidAtRef.current < 5000
        ) {
          return;
        }

        lastUidRef.current = result.uid;
        lastUidAtRef.current = now;

        await handleCardUid(result.uid, "poll");
      } catch (err) {
        console.error("Background RFID poll failed:", err);
      } finally {
        pollingBusyRef.current = false;
      }
    }

    const id = setInterval(poll, 2000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollingActive, stationId, currentUserId, isGateStation]);


  if (!showButton) return null;

  return (
    <div className="fixed bottom-6 left-6 z-40 flex flex-col gap-1">
      <Button
        variation="secondary"
        onClick={handleTap}
        disabled={busy || !!disabledReason}
        className="text-xs px-3 py-2"
      >
        {busy ? "Reading card..." : "Tap RFID"}
      </Button>
      {disabledReason && (
        <p className="text-[10px] text-red-200 max-w-xs">{disabledReason}</p>
      )}
      {!disabledReason && stationName && (
        <p className="text-[10px] text-white/80">
          Station: {stationName} ({isGateStation ? "Gate" : "Building"})
        </p>
      )}
    </div>
  );
}
