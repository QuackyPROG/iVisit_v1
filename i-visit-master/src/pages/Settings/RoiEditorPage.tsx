import { useState, useEffect, useRef, useCallback } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import Button from "../../components/common/Button";
import Select from "../../components/common/Select";
import Meta from "../../utils/Meta";
import { useToast } from "../../contexts/ToastContext";
import type { SupportedIdType, RoiSpec } from "../../utils/cardTemplates";
import { getTemplateForIdType } from "../../utils/cardTemplates";
import {
    getCustomRois,
    saveCustomRois,
    resetCustomRois,
} from "../../utils/customRois";

const ID_TYPES: SupportedIdType[] = [
    "National ID",
    "PhilHealth ID",
    "UMID",
    "School ID",
    "SSS ID",
    "Driver's License",
];

interface DraggableRoi extends RoiSpec {
    isDragging: boolean;
    isResizing: boolean;
}

export default function RoiEditorPage() {
    Meta({ title: "ROI Editor - iVisit" });
    const { showToast } = useToast();

    const [selectedIdType, setSelectedIdType] = useState<SupportedIdType | "">(
        ""
    );
    const [rois, setRois] = useState<DraggableRoi[]>([]);
    const [activeRoiKey, setActiveRoiKey] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [isCustom, setIsCustom] = useState(false);
    const [sampleImage, setSampleImage] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isDragging = useRef(false);
    const isResizing = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const originalRoi = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

    useEffect(() => {
        if (!selectedIdType) {
            setRois([]);
            setHasChanges(false);
            setIsCustom(false);
            return;
        }

        const custom = getCustomRois(selectedIdType);
        const template = getTemplateForIdType(selectedIdType);

        if (custom) {
            setRois(custom.rois.map((r) => ({ ...r, isDragging: false, isResizing: false })));
            setIsCustom(true);
        } else if (template) {
            setRois(template.rois.map((r) => ({ ...r, isDragging: false, isResizing: false })));
            setIsCustom(false);
        } else {
            setRois([]);
            setIsCustom(false);
        }
        setHasChanges(false);
    }, [selectedIdType]);

    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Please upload an image file', { variant: 'error' });
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setSampleImage(event.target?.result as string);
            showToast('Sample image loaded', { variant: 'success' });
        };
        reader.readAsDataURL(file);
    }, [showToast]);

    const handleClearImage = useCallback(() => {
        setSampleImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent, roiKey: string, mode: "drag" | "resize") => {
            e.preventDefault();
            e.stopPropagation();
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;

            const roi = rois.find((r) => r.key === roiKey);
            if (!roi) return;

            setActiveRoiKey(roiKey);
            dragStart.current = { x: e.clientX, y: e.clientY };
            originalRoi.current = { x: roi.x, y: roi.y, width: roi.width, height: roi.height };

            if (mode === "drag") {
                isDragging.current = true;
            } else {
                isResizing.current = true;
            }
        },
        [rois]
    );

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!activeRoiKey || (!isDragging.current && !isResizing.current)) return;

            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect || !originalRoi.current) return;

            const deltaX = (e.clientX - dragStart.current.x) / rect.width;
            const deltaY = (e.clientY - dragStart.current.y) / rect.height;

            setRois((prev) =>
                prev.map((roi) => {
                    if (roi.key !== activeRoiKey) return roi;

                    if (isDragging.current) {
                        let newX = Math.max(0, Math.min(1 - roi.width, originalRoi.current!.x + deltaX));
                        let newY = Math.max(0, Math.min(1 - roi.height, originalRoi.current!.y + deltaY));
                        return { ...roi, x: newX, y: newY };
                    }

                    if (isResizing.current) {
                        let newWidth = Math.max(0.05, Math.min(1 - originalRoi.current!.x, originalRoi.current!.width + deltaX));
                        let newHeight = Math.max(0.05, Math.min(1 - originalRoi.current!.y, originalRoi.current!.height + deltaY));
                        return { ...roi, width: newWidth, height: newHeight };
                    }

                    return roi;
                })
            );
            setHasChanges(true);
        },
        [activeRoiKey]
    );

    const handleMouseUp = useCallback(() => {
        isDragging.current = false;
        isResizing.current = false;
        setActiveRoiKey(null);
        originalRoi.current = null;
    }, []);

    const handleSave = () => {
        if (!selectedIdType) return;

        const roiSpecs: RoiSpec[] = rois.map(({ isDragging, isResizing, ...r }) => r);
        saveCustomRois(selectedIdType, roiSpecs);
        setIsCustom(true);
        setHasChanges(false);
        showToast(`Custom ROIs saved for ${selectedIdType}`, { variant: "success" });
    };

    const handleReset = () => {
        if (!selectedIdType) return;

        resetCustomRois(selectedIdType);
        const template = getTemplateForIdType(selectedIdType);
        if (template) {
            setRois(template.rois.map((r) => ({ ...r, isDragging: false, isResizing: false })));
        }
        setIsCustom(false);
        setHasChanges(false);
        showToast(`Reset to default ROIs for ${selectedIdType}`, { variant: "info" });
    };

    const roiColors: Record<string, string> = {
        fullName: "#22c55e",
        idNumber: "#3b82f6",
        dob: "#f59e0b",
        institution: "#8b5cf6",
        faculty: "#ec4899",
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold mb-1">ROI Editor</h1>
                    <p className="text-sm text-gray-300">
                        Adjust Region of Interest positions for each card type to improve OCR accuracy.
                        Changes are saved locally and persist across logins.
                    </p>
                </div>

                <div className="bg-white/5 border border-white/20 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <label className="text-sm text-gray-200 flex flex-col gap-1 min-w-48">
                            <span>Card Type</span>
                            <Select
                                id="cardTypeSelect"
                                placeholder="Select card type..."
                                value={selectedIdType}
                                onChange={(v) => setSelectedIdType(v as SupportedIdType | "")}
                                options={ID_TYPES.map((t) => ({ value: t, label: t }))}
                            />
                        </label>

                        {selectedIdType && (
                            <div className="flex items-center gap-2 ml-auto">
                                {isCustom && (
                                    <span className="text-xs bg-amber-500/20 text-amber-200 px-2 py-1 rounded">
                                        Custom
                                    </span>
                                )}
                                <Button
                                    variation="secondary"
                                    onClick={handleReset}
                                    disabled={!isCustom && !hasChanges}
                                >
                                    Reset to Defaults
                                </Button>
                                <Button
                                    variation="primary"
                                    onClick={handleSave}
                                    disabled={!hasChanges}
                                >
                                    Save Changes
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {selectedIdType && (
                    <div className="bg-white/5 border border-white/20 rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <p className="text-sm text-gray-300">
                                Drag boxes to reposition. Drag bottom-right corner to resize.
                            </p>
                            <div className="flex items-center gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    id="sampleImageUpload"
                                />
                                <Button
                                    variation="secondary"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {sampleImage ? 'Change Image' : 'Upload Sample ID'}
                                </Button>
                                {sampleImage && (
                                    <Button
                                        variation="secondary"
                                        onClick={handleClearImage}
                                    >
                                        Clear Image
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div
                            ref={containerRef}
                            className="relative w-full bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg overflow-hidden select-none"
                            style={{ aspectRatio: "85.6 / 53.98" }}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        >
                            {sampleImage ? (
                                <img
                                    src={sampleImage}
                                    alt="Sample ID"
                                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm pointer-events-none">
                                    Upload a sample ID image for reference
                                </div>
                            )}

                            {rois.map((roi) => (
                                <div
                                    key={roi.key}
                                    className="absolute border-2 rounded cursor-move transition-shadow"
                                    style={{
                                        left: `${roi.x * 100}%`,
                                        top: `${roi.y * 100}%`,
                                        width: `${roi.width * 100}%`,
                                        height: `${roi.height * 100}%`,
                                        borderColor: roiColors[roi.key] || "#888",
                                        backgroundColor: `${roiColors[roi.key] || "#888"}30`,
                                        boxShadow: activeRoiKey === roi.key ? "0 0 0 2px white" : undefined,
                                    }}
                                    onMouseDown={(e) => handleMouseDown(e, roi.key, "drag")}
                                >
                                    <span
                                        className="absolute -top-5 left-0 text-xs px-1 rounded whitespace-nowrap font-medium"
                                        style={{
                                            backgroundColor: roiColors[roi.key] || "#888",
                                            color: "#000",
                                        }}
                                    >
                                        {roi.label}
                                    </span>

                                    <div
                                        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
                                        style={{ backgroundColor: roiColors[roi.key] || "#888" }}
                                        onMouseDown={(e) => handleMouseDown(e, roi.key, "resize")}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                            {rois.map((roi) => (
                                <div
                                    key={roi.key}
                                    className="bg-white/5 rounded p-2 flex items-center gap-2"
                                >
                                    <div
                                        className="w-3 h-3 rounded"
                                        style={{ backgroundColor: roiColors[roi.key] || "#888" }}
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium">{roi.label}</div>
                                        <div className="text-gray-400">
                                            x:{(roi.x * 100).toFixed(0)}% y:{(roi.y * 100).toFixed(0)}%
                                            w:{(roi.width * 100).toFixed(0)}% h:{(roi.height * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
