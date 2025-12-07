// src/pages/LogVisitor/StartLogModal.tsx
import Modal from "../../components/common/Modal";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Select from "../../components/common/Select";
import { type Visitor, type Station } from "../../api/Index";
import { PURPOSE_OPTIONS } from "../../constants/purposeOptions";

interface StartLogModalProps {
  isOpen: boolean;
  visitor: Visitor | null;

  stations: Station[];
  startPurpose: string;
  onStartPurposeChange: (value: string) => void;

  startPassId: string;
  onStartPassIdChange: (value: string) => void;

  startAllowedStationIds: number[];
  onToggleAllowedStation: (id: number) => void;

  rfidStatus: string | null;
  rfidLoading: boolean;

  onClose: () => void;
  onReadRfid: () => void;
  onSubmit: () => void;
}

export function StartLogModal({
  isOpen,
  visitor,
  stations,
  startPurpose,
  onStartPurposeChange,
  startPassId,
  onStartPassIdChange,
  startAllowedStationIds,
  onToggleAllowedStation,
  rfidStatus,
  rfidLoading,
  onClose,
  onReadRfid,
  onSubmit,
}: StartLogModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start Log">
      {!visitor ? (
        <p className="text-sm text-slate-300">
          No visitor selected. Close this dialog and try again.
        </p>
      ) : (
        <div className="flex flex-col gap-3 text-white">
          <p className="text-sm text-slate-300 mb-1">
            Starting log for{" "}
            <span className="font-semibold">{visitor.visitorName}</span>
          </p>

          {/* Purpose of visit */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-slate-200">
              Purpose of visit <span className="text-red-400">*</span>
            </label>
            <Select
              id="start-log-purpose"
              value={startPurpose}
              options={PURPOSE_OPTIONS}
              placeholder="Select purpose of visit"
              onChange={onStartPurposeChange}
            />
          </div>

          {/* Pass code + RFID tap */}
          <div className="flex flex-col gap-2">
            <label className="text-sm">
              Visitor Pass Code
              <span className="text-xs text-slate-400 ml-1">
                (e.g. 001 – you can tap an RFID card to auto-fill)
              </span>
            </label>

            <div className="flex gap-2">
              <Input
                placeholder="Enter pass code"
                value={startPassId}
                onChange={(e) => onStartPassIdChange(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variation="secondary"
                className="whitespace-nowrap"
                disabled={rfidLoading}
                onClick={onReadRfid}
              >
                {rfidLoading ? "Reading..." : "Tap card"}
              </Button>
            </div>

            {rfidStatus && (
              <p className="text-xs text-slate-300 mt-1">{rfidStatus}</p>
            )}
          </div>

          {/* Allowed Stations */}
          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto custom-scrollbar">
            <label className="text-sm">Allowed Stations</label>
            {stations.length === 0 ? (
              <p className="text-xs text-slate-400">No stations available.</p>
            ) : (
              stations.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={startAllowedStationIds.includes(s.id)}
                    onChange={() => onToggleAllowedStation(s.id)}
                  />
                  {s.name}
                </label>
              ))
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variation="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onSubmit}>Start</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
