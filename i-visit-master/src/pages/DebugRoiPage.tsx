// src/pages/DebugRoiPage.tsx
import { useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { IdRoiDebug } from "../debug/IdRoiDebug";

export default function DebugRoiPage() {
  const [idType, setIdType] = useState("National ID");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">ROI Debug</h1>

        <div className="flex gap-4 items-center">
          <select
            className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
            value={idType}
            onChange={(e) => setIdType(e.target.value)}
          >
            <option>National ID</option>
            <option>PhilHealth ID</option>
            <option>UMID</option>
            {/* add more here as you create templates */}
          </select>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>

        {imageUrl ? (
          <IdRoiDebug imageUrl={imageUrl} idType={idType} />
        ) : (
          <p className="text-gray-400 text-sm">
            Upload a sample card image to visualize ROIs.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
