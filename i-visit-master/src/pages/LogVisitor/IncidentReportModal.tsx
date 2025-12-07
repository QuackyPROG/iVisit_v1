// src/pages/LogVisitor/IncidentReportModal.tsx
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import { type Visitor, type VisitorLogDTO } from "../../api/Index";

interface IncidentReportModalProps {
  isOpen: boolean;
  onClose: () => void;

  visitor: Visitor | null;
  log: VisitorLogDTO | null;

  incidentType: string;
  incidentDescription: string;
  loading: boolean;

  onIncidentTypeChange: (value: string) => void;
  onIncidentDescriptionChange: (value: string) => void;
  onSubmit: () => void;
}

export function IncidentReportModal({
  isOpen,
  onClose,
  visitor,
  log,
  incidentType,
  incidentDescription,
  loading,
  onIncidentTypeChange,
  onIncidentDescriptionChange,
  onSubmit,
}: IncidentReportModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Report Pass Incident"
    >
      {visitor && log ? (
        <div className="flex flex-col gap-3 text-white">
          <p className="text-sm text-slate-300">
            Reporting incident for visitor{" "}
            <span className="font-semibold">
              {visitor.visitorName}
            </span>
            {log.passNo &&
              log.passNo !== "—" &&
              log.passNo !== "-" && (
                <>
                  {" "}
                  with pass{" "}
                  <span className="font-semibold">
                    {log.passNo}
                  </span>
                </>
              )}
            .
          </p>

          <div>
            <p className="text-sm mb-1">Incident Type</p>
            <select
              className="bg-slate-800 border border-slate-600 rounded px-2 py-2 w-full text-sm"
              value={incidentType}
              onChange={(e) => onIncidentTypeChange(e.target.value)}
            >
              <option value="LOST">Lost</option>
              <option value="DAMAGED">Damaged</option>
              <option value="NOT_RETURNED">Not returned</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <p className="text-sm mb-1">Details / Notes</p>
            <textarea
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-2 text-sm resize-y min-h-[80px]"
              placeholder="Describe briefly what happened (where it was lost, how it was damaged, etc.)"
              value={incidentDescription}
              onChange={(e) => onIncidentDescriptionChange(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 mt-3">
            <Button
              variation="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={loading}
            >
              {loading ? "Reporting..." : "Report Incident"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-300">
          No active visitor / log selected. Close this dialog and try again.
        </p>
      )}
    </Modal>
  );
}
