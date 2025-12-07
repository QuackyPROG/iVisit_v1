// src/pages/LogVisitor/VisitorProfileModal.tsx
import Modal from "../../components/common/Modal";
import { type Visitor } from "../../api/Index";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getPhotoUrl(raw?: string) {
  if (!raw) return undefined;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return `${API_BASE_URL}${path}`;
}

interface VisitorProfileModalProps {
  isOpen: boolean;
  visitor: Visitor | null;
  onClose: () => void;
}

export function VisitorProfileModal({
  isOpen,
  visitor,
  onClose,
}: VisitorProfileModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Visitor Profile">
      {visitor && (
        <div className="flex flex-col gap-3 text-white">
          <div className="flex gap-4">
            {visitor.photoPath ? (
              <img
                src={getPhotoUrl(visitor.photoPath)}
                alt={visitor.visitorName}
                className="w-32 h-32 object-cover rounded-md border border-white/20"
              />
            ) : (
              <div className="w-32 h-32 flex items-center justify-center rounded-md border border-dashed border-white/20 text-xs text-slate-400">
                No photo
              </div>
            )}

            <div className="flex-1">
              <p className="text-lg font-semibold">{visitor.visitorName}</p>

              <p className="text-sm text-slate-300">
                Visitor Type: {visitor.visitorType ?? "N/A"}
              </p>

              {/* NEW LINE — Gender */}
              <p className="text-sm text-slate-300">
                Gender: {visitor.gender ?? "—"}
              </p>

              <p className="text-sm text-slate-300">
                Date of Birth: {visitor.dateOfBirth ?? "—"}
              </p>
              <p className="text-sm text-slate-300">
                Registered At: {visitor.createdAt ?? "—"}
              </p>
            </div>
          </div>

          <div className="mt-2 text-sm">
            <p>
              <span className="font-semibold">ID Type:</span>{" "}
              {visitor.idType}
            </p>
            <p>
              <span className="font-semibold">ID Number:</span>{" "}
              {visitor.idNumber}
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
