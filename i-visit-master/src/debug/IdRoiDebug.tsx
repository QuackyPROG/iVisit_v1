// src/debug/IdRoiDebug.tsx
import { getTemplateForIdType } from "../utils/cardTemplates";

interface IdRoiDebugProps {
  imageUrl: string;     // data URL or static sample path
  idType: string;       // e.g. "National ID", "PhilHealth ID"
}

export function IdRoiDebug({ imageUrl, idType }: IdRoiDebugProps) {
  const tpl = getTemplateForIdType(idType);
  if (!tpl) {
    return <p className="text-red-400">No template for idType={idType}</p>;
  }

  return (
    <div className="inline-block relative border border-yellow-400">
      <img src={imageUrl} alt={idType} className="block max-w-full" />
      {/* overlay ROIs */}
      {tpl.rois.map((roi, idx) => (
        <div
          key={idx}
          style={{
            position: "absolute",
            left: `${roi.x * 100}%`,
            top: `${roi.y * 100}%`,
            width: `${roi.width * 100}%`,
            height: `${roi.height * 100}%`,
            border: "2px solid rgba(0, 255, 0, 0.8)",
            boxSizing: "border-box",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: "-1.2rem",
              left: 0,
              fontSize: "0.7rem",
              background: "rgba(0,0,0,0.6)",
              color: "white",
              padding: "2px 4px",
            }}
          >
            {roi.label}
          </span>
        </div>
      ))}
    </div>
  );
}
