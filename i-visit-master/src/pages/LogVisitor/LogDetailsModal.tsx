// src/pages/LogVisitor/LogDetailsModal.tsx
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import {
  type Visitor,
  type VisitorLogDTO,
  type VisitorLogEntryDTO,
} from "../../api/Index";

interface LogDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;

  visitor: Visitor | null;
  log: VisitorLogDTO | null;
  entries: VisitorLogEntryDTO[];

  detailsLoading: boolean;

  // station context
  hasStationContext: boolean;       // currentStationId && currentStation
  isGateStation: boolean;
  showBuildingPassControls: boolean; // buildings only (currentStation && !isGate)

  // pass / RFID state (buildings)
  detailsPassCode: string;
  detailsRfidStatus: string | null;
  detailsRfidLoading: boolean;

  // callbacks
  onChangePassCode: (value: string) => void;
  onReadRfidForDetails: () => void;
  onGrantPass: () => void;
  onRevokePass: () => void;
  onReportIncidentClick: () => void;
  onEndLog: () => void;
  onLogHere: () => void;
}

export function LogDetailsModal({
  isOpen,
  onClose,
  visitor,
  log,
  entries,
  detailsLoading,
  hasStationContext,
  isGateStation,
  showBuildingPassControls,
  detailsPassCode,
  detailsRfidStatus,
  detailsRfidLoading,
  onChangePassCode,
  onReadRfidForDetails,
  onGrantPass,
  onRevokePass,
  onReportIncidentClick,
  onEndLog,
  onLogHere,
}: LogDetailsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Visitor Log Details"
    >
      {visitor && log ? (
        <div className="flex flex-col gap-3 text-white">
          {/* Header info */}
          <div>
            <p className="text-lg font-semibold">
              {visitor.visitorName}
            </p>
            <p className="text-sm text-slate-300">
              Purpose: {log.purposeOfVisit ?? "N/A"}
            </p>
            <p className="text-sm text-slate-300">
              Current Location: {log.location ?? "N/A"}
            </p>
            <p className="text-sm text-slate-300">
              Pass No: {log.passNo ?? "—"}
            </p>
            <p className="text-sm text-slate-300 mt-1">
              Allowed Stations:{" "}
              {log.allowedStations && log.allowedStations.length > 0
                ? log.allowedStations.join(", ")
                : "N/A"}
            </p>
          </div>

          {/* Building-only pass controls (grant/revoke, lost) */}
          {showBuildingPassControls && (
            <div className="mt-3 border-t border-white/10 pt-3">
              {log.passNo &&
                log.passNo !== "—" &&
                log.passNo !== "-" ? (
                // Visitor currently HAS a pass
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-300">
                    This visitor currently has pass:{" "}
                    <span className="font-semibold">
                      {log.passNo}
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variation="secondary"
                      onClick={onRevokePass}
                      disabled={detailsLoading}
                      className="text-xs px-3 py-1"
                    >
                      Revoke Pass
                    </Button>
                  </div>
                </div>
              ) : (
                // Visitor currently has NO pass
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-slate-300">
                    This visitor has no assigned RFID pass for this session.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Enter pass code (e.g. 001)"
                      value={detailsPassCode}
                      onChange={(e) => onChangePassCode(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variation="secondary"
                      className="whitespace-nowrap text-xs px-3 py-1"
                      disabled={detailsRfidLoading}
                      onClick={onReadRfidForDetails}
                    >
                      {detailsRfidLoading ? "Reading..." : "Tap card"}
                    </Button>
                    <Button
                      onClick={onGrantPass}
                      disabled={detailsLoading}
                      className="text-xs px-3 py-1"
                    >
                      Grant Pass
                    </Button>
                  </div>
                  {detailsRfidStatus && (
                    <p className="text-xs text-slate-300 mt-1">
                      {detailsRfidStatus}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Visited stations list */}
          <div className="mt-2">
            <p className="font-semibold mb-1 text-sm">Visited Stations</p>
            {entries.length === 0 ? (
              <p className="text-xs text-slate-400">
                No movement recorded yet.
              </p>
            ) : (
              <ul className="text-xs text-slate-200 space-y-1 max-h-40 overflow-y-auto">
                {entries
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(a.timestamp).getTime() -
                      new Date(b.timestamp).getTime()
                  )
                  .map((e) => (
                    <li key={e.entryId}>
                      <span className="font-semibold">
                        {e.stationName}
                      </span>{" "}
                      – {e.timestamp} (by {e.guardName})
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {/* Incident button (for any station, as long as there is a pass) */}
          {log.passNo &&
            log.passNo !== "—" &&
            log.passNo !== "-" && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="text-sm text-slate-300 mb-2">
                  If this visitor&apos;s RFID pass was lost, damaged, or not
                  returned, you can record an incident for it.
                </p>
                <Button
                  variation="outlined"
                  className="text-xs px-3 py-1 border-red-500 text-red-300"
                  disabled={detailsLoading}
                  onClick={onReportIncidentClick}
                >
                  Report Lost / Damaged Pass
                </Button>
              </div>
            )}

          {/* Footer buttons: Close + End Log / Log Here */}
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variation="secondary"
              onClick={onClose}
              disabled={detailsLoading}
            >
              Close
            </Button>

            {hasStationContext ? (
              isGateStation ? (
                // Gates: end the campus-level log
                <Button
                  onClick={onEndLog}
                  disabled={detailsLoading}
                >
                  {detailsLoading ? "Ending..." : "End Log"}
                </Button>
              ) : (
                // Buildings: record movement here
                <Button
                  onClick={onLogHere}
                  disabled={detailsLoading}
                >
                  {detailsLoading ? "Logging..." : "Log Here"}
                </Button>
              )
            ) : (
              // Fallback: no station in context -> End Log
              <Button
                onClick={onEndLog}
                disabled={detailsLoading}
              >
                {detailsLoading ? "Ending..." : "End Log"}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-300">
          No active visitor log selected. Close this dialog and try again.
        </p>
      )}
    </Modal>
  );
}
