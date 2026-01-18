import { useEffect, useState, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import Select from "../../components/common/Select";
import DashboardLayout from "../../layouts/DashboardLayout";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import Meta from "../../utils/Meta";
import { useToast } from "../../contexts/ToastContext";
import ScanGuideOverlay from "../../components/ocr/ScanGuideOverlay";

import { useCamera } from "../../hooks/useCamera";
import { registerVisitor, getStationById, type Station } from "../../api/Index";
import { type ExtractedInfo } from "../../utils/idParsers";

import { cropIdCardFromDataUrl } from "../../utils/cardCropper";
import { detectCard } from "../../utils/cardDetector";
import {
  getRoisForIdType,
  cropFieldsFromCard,
  ocrDataUrlViaHelper,
  runWholeCardOcrAndParse,
  cleanRoiName,
  extractDobFromText,
  extractNationalIdNumber,
  extractPhilHealthIdNumber,
  extractSssIdNumber,
  visionOcrExtract,
} from "../../utils/ocrFieldHelpers";

import { PURPOSE_OPTIONS } from "../../constants/purposeOptions";
import {
  VISITOR_TYPE_OPTIONS,
  normalizeVisitorType,
} from "../../constants/visitorTypes";

interface ExtendedExtractedInfo extends ExtractedInfo {
  purposeOfVisit: string;
  visitorType?: string;
  gender?: string;
}

interface ManualData {
  fullName: string;
  dob: string;
  idNumber: string;
}

const ID_TYPE_OPTIONS = [
  { label: "Select ID Type", value: "" },

  { label: "PhilSys National ID", value: "National ID" },
  { label: "PhilHealth ID", value: "PhilHealth ID" },
  { label: "UMID", value: "UMID" },

  { label: "Philippine Passport", value: "Passport" },
  { label: "Driver’s License", value: "Driver's License" },
  { label: "PRC ID", value: "PRC ID" },
  { label: "SSS ID", value: "SSS ID" },
  { label: "Other ID", value: "Other" },
];

const GENDER_OPTIONS = [
  { label: "Select gender", value: "" },
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
  { label: "Prefer not to say", value: "Unspecified" },
];

export default function ScanIdPage() {
  Meta({ title: "Scan Visitor ID - iVisit" });

  const navigate = useNavigate();
  const [cookies] = useCookies(["role", "stationId"]);
  const role = cookies.role as "admin" | "guard" | "support" | undefined;
  const rawStationId = cookies.stationId;
  const { showToast } = useToast();

  const [isGateStation, setIsGateStation] = useState<boolean | null>(null);

  useEffect(() => {
    if (role !== "guard") {
      setIsGateStation(null); // not relevant
      return;
    }

    if (rawStationId == null) {
      setIsGateStation(false);
      return;
    }

    const parsed =
      typeof rawStationId === "number"
        ? rawStationId
        : Number.parseInt(String(rawStationId), 10);

    if (Number.isNaN(parsed)) {
      setIsGateStation(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const station: Station = await getStationById(parsed);
        if (cancelled) return;

        const type = ((station as any).stationType || "").toUpperCase();
        const isGateExplicit = type === "GATE";

        const name = (station.name || "").toLowerCase();
        const looksLikeGateByName = name.includes("gate");

        setIsGateStation(isGateExplicit || looksLikeGateByName);
      } catch {
        if (!cancelled) setIsGateStation(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [role, rawStationId]);

  // If a guard at a non-gate tries to open ScanId, punt them to Log Visitor
  if (role === "guard" && isGateStation === false) {
    return <Navigate to="/dashboard/log-visitor" replace />;
  }

  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);

  // Single source-of-truth dropdown states
  const [selectedVisitorType, setSelectedVisitorType] = useState<string>("");
  const [selectedIdType, setSelectedIdType] = useState<string>("");
  const [selectedPurpose, setSelectedPurpose] = useState<string>("");
  const [selectedGender, setSelectedGender] = useState<string>("");

  const [extractedInfo, setExtractedInfo] =
    useState<ExtendedExtractedInfo | null>(null);

  // Debug / feedback preview of what OCR actually saw
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);

  // Manual only keeps identity fields; classification is via selected* states
  const [manualData, setManualData] = useState<ManualData>({
    fullName: "",
    dob: "",
    idNumber: "",
  });

  const [capturedVisitorPhoto, setCapturedVisitorPhoto] =
    useState<string | null>(null);
  const [isVisitorCameraOpen, setIsVisitorCameraOpen] =
    useState<boolean>(false);

  // For the live scan modal
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [isFrozen, setIsFrozen] = useState(false);

  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auto-capture state
  const [autoCapture, setAutoCapture] = useState(false);
  const [autoStatus, setAutoStatus] = useState<string>("");
  const autoCaptureRef = useRef<boolean>(false);

  // Ref for camera container (for visual guide overlay)
  const cameraContainerRef = useRef<HTMLDivElement>(null);

  // Camera hook for ID/OCR
  const {
    videoRef,
    startCamera,
    stopCamera,
    captureFrame,
    error: cameraError,
  } = useCamera();

  // Camera hook for visitor photo
  const {
    videoRef: visitorVideoRef,
    startCamera: startVisitorCamera,
    stopCamera: stopVisitorCamera,
    captureFrame: captureVisitorFrame,
    error: visitorCameraError,
  } = useCamera();

  // Start/stop ID camera when modal opens/closes
  useEffect(() => {
    if (isCameraModalOpen) {
      startCamera();
    } else {
      stopCamera();
      // Also reset frozen state when modal is closed
      setIsFrozen(false);
      setScanPreview(null);
    }
  }, [isCameraModalOpen, startCamera, stopCamera]);

  // Start/stop visitor camera when modal opens/closes
  useEffect(() => {
    if (isVisitorCameraOpen) {
      setCapturedVisitorPhoto(null);
      startVisitorCamera();
    } else {
      stopVisitorCamera();
    }
  }, [isVisitorCameraOpen, startVisitorCamera, stopVisitorCamera]);

  // Keep autoCaptureRef in sync with state
  useEffect(() => {
    autoCaptureRef.current = autoCapture;
  }, [autoCapture]);

  // Auto-capture: continuously detect card and trigger scan when ready
  useEffect(() => {
    if (!isCameraModalOpen || isFrozen || scanning) return;
    if (!autoCapture) {
      setAutoStatus("");
      return;
    }

    let cancelled = false;
    let consecutiveGoodFrames = 0;
    const REQUIRED_GOOD_FRAMES = 3; // Need 3 consecutive good frames

    const checkFrame = async () => {
      if (cancelled || !autoCaptureRef.current || isFrozen || scanning) return;

      const frame = captureFrame();
      if (!frame) {
        setAutoStatus("📷 Waiting for camera...");
        return;
      }

      try {
        const detection = await detectCard(frame);

        if (detection.detected && detection.confidence > 0.6) {
          consecutiveGoodFrames++;
          const progress = Math.min(consecutiveGoodFrames / REQUIRED_GOOD_FRAMES * 100, 100);
          setAutoStatus(`✅ Card detected! Hold steady... ${Math.round(progress)}%`);

          if (consecutiveGoodFrames >= REQUIRED_GOOD_FRAMES) {
            setAutoStatus("📸 Capturing...");
            // Auto-trigger the scan
            const scanButton = document.getElementById("scan-trigger-btn");
            if (scanButton) {
              scanButton.click();
            }
            cancelled = true;
            return;
          }
        } else {
          consecutiveGoodFrames = 0;
          if (detection.confidence > 0.3) {
            setAutoStatus("🔍 Move card closer to frame...");
          } else {
            setAutoStatus("🔍 Position ID card within the frame");
          }
        }
      } catch (err) {
        console.error("Auto-capture detection error:", err);
        setAutoStatus("⚠️ Detection error");
      }
    };

    // Check every 500ms
    const intervalId = setInterval(checkFrame, 500);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [isCameraModalOpen, autoCapture, isFrozen, scanning, captureFrame]);

  // ID scan + OCR + parsing (ROI + whole-card fallback)
  const handleScanClick = async () => {
    if (scanning) return;

    // Note: ID type selection is optional - Vision OCR can auto-detect

    setScanning(true);

    const dataUrl = captureFrame();
    if (!dataUrl) {
      showToast("Unable to capture image from camera.", { variant: "error" });
      setScanning(false);
      return;
    }

    // Freeze current frame in the modal
    setScanPreview(dataUrl);
    setIsFrozen(true);
    stopCamera();

    try {
      // 1. Deskew & crop the whole card with OpenCV
      const cropResult = await cropIdCardFromDataUrl(dataUrl);
      const cardDetected = cropResult.success && cropResult.dataUrl;
      const finalDataUrl = cardDetected ? cropResult.dataUrl! : dataUrl;

      console.log("[Scan] Card detection:", cardDetected ? "SUCCESS" : "FAILED (using original image)");

      // Show what OCR will actually see
      setScanPreview(finalDataUrl);
      setCroppedPreview(finalDataUrl);

      // 2. Try AI Vision OCR FIRST (most accurate, doesn't need ROI)
      console.log("[Scan] Trying Vision OCR...");
      const visionResult = await visionOcrExtract(finalDataUrl);
      console.log("[Scan] Vision OCR:", visionResult.success ? "SUCCESS" : "FAILED");

      let roiFullName = "";
      let roiDob = "";
      let roiIdNumber = "";

      // 3. Only use ROI if card was detected AND Vision failed
      // ROI on uncropped image gives garbage results
      if (cardDetected && !visionResult.success) {
        console.log("[Scan] Using ROI cropping on detected card...");
        const rois = getRoisForIdType(selectedIdType);
        const fieldImages = await cropFieldsFromCard(finalDataUrl, rois);

        // OCR each ROI via helper (Tess4J)
        if (fieldImages.fullName) {
          const text = await ocrDataUrlViaHelper(fieldImages.fullName);
          roiFullName = cleanRoiName(text);
        }

        if (fieldImages.dob) {
          const text = await ocrDataUrlViaHelper(fieldImages.dob);
          roiDob = extractDobFromText(text);
        }

        if (fieldImages.idNumber) {
          const text = await ocrDataUrlViaHelper(fieldImages.idNumber);
          // Use ID-type-specific parsing
          if (selectedIdType === "PhilHealth ID") {
            roiIdNumber = extractPhilHealthIdNumber(text);
          } else if (selectedIdType === "SSS ID") {
            roiIdNumber = extractSssIdNumber(text);
          } else {
            roiIdNumber = extractNationalIdNumber(text) || text.trim();
          }
        }
      } else if (!visionResult.success) {
        console.log("[Scan] Card detection failed & Vision failed - using full-image OCR only");
      }

      const roiHasAnyData = !!roiFullName || !!roiDob || !!roiIdNumber;

      // 4. Run full-card OCR as backup (only if Vision failed)
      let fromFull: ExtractedInfo = {
        fullName: "",
        dob: "",
        idNumber: "",
        idType: selectedIdType || "Unknown",
      };

      if (!visionResult.success) {
        console.log("[Scan] Running full-card Tesseract OCR...");
        const parsedFromFull = await runWholeCardOcrAndParse(
          finalDataUrl,
          selectedIdType
        );
        fromFull = parsedFromFull ?? fromFull;
      }

      // 5. Merge ROI + full-card + Vision results (Vision takes priority if successful)
      function isReasonableName(candidate: string): boolean {
        const trimmed = candidate.trim();
        if (trimmed.length < 5) return false;
        if (/name/i.test(trimmed)) return false;
        if (!/\s/.test(trimmed)) return false; // require at least 2 tokens
        return true;
      }

      const useRoiName =
        roiFullName && isReasonableName(roiFullName);

      // Priority: Vision > ROI > Full-card Tesseract
      const mergedFullName = visionResult.success && visionResult.fullName
        ? visionResult.fullName
        : selectedIdType === "National ID"
          ? fromFull.fullName || roiFullName || ""
          : (useRoiName ? roiFullName : fromFull.fullName) || "";

      const mergedDob = visionResult.success && visionResult.dob
        ? visionResult.dob
        : roiDob || fromFull.dob || "";

      const mergedIdNumber = visionResult.success && visionResult.idNumber
        ? visionResult.idNumber
        : roiIdNumber || fromFull.idNumber || "";

      const mergedIdType = visionResult.success && visionResult.idType
        ? visionResult.idType
        : fromFull.idType || selectedIdType || "Unknown";

      const hasUsefulData =
        mergedFullName.length > 0 ||
        mergedDob.length > 0 ||
        mergedIdNumber.length > 0;

      if (!hasUsefulData && !roiHasAnyData) {
        showToast(
          "OCR couldn't extract details. Adjust lighting/position, retry, or use Manual Entry.",
          { variant: "error" }
        );
        setIsFrozen(false);
        setScanPreview(null);
        startCamera();
        return;
      }

      const extended: ExtendedExtractedInfo = {
        fullName: mergedFullName,
        dob: mergedDob,
        idNumber: mergedIdNumber,
        idType: mergedIdType,
        purposeOfVisit: selectedPurpose || "Others",
        visitorType: selectedVisitorType || "Guest / Visitor",
        gender: selectedGender || "",
      };

      setExtractedInfo(extended);

      // Auto-update dropdowns if auto-detected
      if (!selectedIdType && mergedIdType && mergedIdType !== "Unknown") {
        setSelectedIdType(mergedIdType);
      }

      // Auto-update gender if detected by Vision
      if (!selectedGender && visionResult.success && visionResult.gender) {
        setSelectedGender(visionResult.gender);
      }

      setManualData({
        fullName: mergedFullName,
        dob: mergedDob,
        idNumber: mergedIdNumber,
      });

      // Close modal, unfreeze and keep camera stopped
      setIsCameraModalOpen(false);
      setIsFrozen(false);
      setScanPreview(null);
      stopCamera();
    } catch (err: any) {
      console.error(err);
      showToast(
        err?.message ||
        "OCR failed — check helper connection and try again.",
        { variant: "error" }
      );
      setIsFrozen(false);
      setScanPreview(null);
      startCamera();
    } finally {
      setScanning(false);
    }
  };

  // File input ref for Upload ID
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload for ID images
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setScanning(true);

    try {
      // Convert file to data URL
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Show preview
      setScanPreview(dataUrl);
      setCroppedPreview(dataUrl);

      // 1. Crop the card
      const cropResult = await cropIdCardFromDataUrl(dataUrl);
      const finalDataUrl = cropResult.success && cropResult.dataUrl ? cropResult.dataUrl : dataUrl;

      // 2. Get ROIs and crop fields (if ID type selected)
      const rois = getRoisForIdType(selectedIdType);
      const fieldImages = await cropFieldsFromCard(finalDataUrl, rois);

      let roiFullName = "";
      let roiDob = "";
      let roiIdNumber = "";

      if (fieldImages.fullName) {
        const text = await ocrDataUrlViaHelper(fieldImages.fullName);
        roiFullName = cleanRoiName(text);
      }
      if (fieldImages.dob) {
        const text = await ocrDataUrlViaHelper(fieldImages.dob);
        roiDob = extractDobFromText(text);
      }
      if (fieldImages.idNumber) {
        const text = await ocrDataUrlViaHelper(fieldImages.idNumber);
        roiIdNumber = extractNationalIdNumber(text) || text.trim();
      }

      // 3. Full-card OCR
      const parsedFromFull = await runWholeCardOcrAndParse(finalDataUrl, selectedIdType);
      const fromFull: ExtractedInfo = parsedFromFull ?? {
        fullName: "",
        dob: "",
        idNumber: "",
        idType: selectedIdType || "Unknown",
      };

      // 4. Vision OCR - use ORIGINAL dataUrl to avoid crop issues
      console.log('Calling Vision OCR with original image...');
      const visionResult = await visionOcrExtract(dataUrl); // Changed from finalDataUrl to dataUrl
      console.log('Vision OCR result:', visionResult);

      // 5. Merge results (Vision > ROI > Tesseract)
      const useRoiName = roiFullName && roiFullName.trim().length >= 5 && /\s/.test(roiFullName);

      const mergedFullName = visionResult.success && visionResult.fullName
        ? visionResult.fullName
        : (useRoiName ? roiFullName : fromFull.fullName) || "";

      const mergedDob = visionResult.success && visionResult.dob
        ? visionResult.dob
        : roiDob || fromFull.dob || "";

      const mergedIdNumber = visionResult.success && visionResult.idNumber
        ? visionResult.idNumber
        : roiIdNumber || fromFull.idNumber || "";

      const mergedIdType = visionResult.success && visionResult.idType
        ? visionResult.idType
        : fromFull.idType || selectedIdType || "Unknown";

      const hasUsefulData = mergedFullName || mergedDob || mergedIdNumber;

      if (!hasUsefulData) {
        showToast("OCR couldn't extract details. Try a clearer image.", { variant: "error" });
        setScanPreview(null);
        return;
      }

      const extended: ExtendedExtractedInfo = {
        fullName: mergedFullName,
        dob: mergedDob,
        idNumber: mergedIdNumber,
        idType: mergedIdType,
        purposeOfVisit: selectedPurpose || "Others",
        visitorType: selectedVisitorType || "Guest / Visitor",
        gender: selectedGender || "",
      };

      setExtractedInfo(extended);

      // Auto-update dropdowns if auto-detected
      if (!selectedIdType && mergedIdType && mergedIdType !== "Unknown") {
        setSelectedIdType(mergedIdType);
      }

      // Auto-update gender if detected by Vision
      if (!selectedGender && visionResult.success && visionResult.gender) {
        setSelectedGender(visionResult.gender);
      }

      setManualData({
        fullName: mergedFullName,
        dob: mergedDob,
        idNumber: mergedIdNumber,
      });

      setScanPreview(null);
      showToast("ID extracted successfully!", { variant: "success" });

    } catch (err: any) {
      console.error(err);
      showToast(err?.message || "OCR failed — try again.", { variant: "error" });
      setScanPreview(null);
    } finally {
      setScanning(false);
      // Reset file input
      if (event.target) event.target.value = "";
    }
  };

  // Manual save -> fill extractedInfo with manualData + current dropdowns
  const handleManualSave = () => {
    const extended: ExtendedExtractedInfo = {
      fullName: manualData.fullName,
      dob: manualData.dob,
      idNumber: manualData.idNumber,
      idType: selectedIdType || extractedInfo?.idType || "Unknown",
      purposeOfVisit:
        selectedPurpose ||
        extractedInfo?.purposeOfVisit ||
        "General Visit",
      visitorType:
        selectedVisitorType ||
        extractedInfo?.visitorType ||
        "Guest / Visitor",
      gender:
        selectedGender || extractedInfo?.gender || "Unspecified",
    };

    setExtractedInfo(extended);
    setIsManualModalOpen(false);
  };

  // Visitor photo capture
  const handleCaptureVisitorPhoto = () => {
    const dataUrl = captureVisitorFrame();
    if (!dataUrl) {
      showToast("Unable to capture visitor photo", { variant: "error" });
      return;
    }
    stopVisitorCamera();
    setCapturedVisitorPhoto(dataUrl);
    setIsVisitorCameraOpen(false);
  };

  // Submit visitor to backend and redirect to LogVisitor
  const handleSubmitVisitor = async () => {
    if (!extractedInfo) {
      showToast("No visitor data available to submit.", {
        variant: "warning",
      });
      return;
    }
    if (submitting) return;
    setSubmitting(true);

    try {
      const fullName = (extractedInfo.fullName || "").trim();
      const dob = (extractedInfo.dob || "").trim();
      const idNumber = (extractedInfo.idNumber || "").trim();

      const effectiveIdType =
        selectedIdType ||
        extractedInfo.idType ||
        "";

      const effectiveVisitorType =
        normalizeVisitorType(
          selectedVisitorType || extractedInfo.visitorType || ""
        ) || "";

      const effectiveGender =
        selectedGender ||
        extractedInfo.gender ||
        "";

      const effectivePurpose =
        selectedPurpose ||
        extractedInfo.purposeOfVisit ||
        "";

      // FRONTEND REQUIRED-FIELD CHECK
      if (!fullName) {
        showToast("Full name is required.", { variant: "warning" });
        setSubmitting(false);
        return;
      }
      if (!dob) {
        showToast("Date of birth is required.", { variant: "warning" });
        setSubmitting(false);
        return;
      }
      if (!idNumber) {
        showToast("ID number is required.", { variant: "warning" });
        setSubmitting(false);
        return;
      }
      if (!effectiveIdType) {
        showToast("ID type is required.", { variant: "warning" });
        setSubmitting(false);
        return;
      }
      if (!effectiveVisitorType) {
        showToast("Visitor type is required.", { variant: "warning" });
        setSubmitting(false);
        return;
      }
      if (!effectiveGender) {
        showToast("Gender is required.", { variant: "warning" });
        setSubmitting(false);
        return;
      }
      if (!effectivePurpose) {
        showToast("Purpose of visit is required.", { variant: "warning" });
        setSubmitting(false);
        return;
      }

      const visitorData = {
        fullName,
        dob,
        idNumber,
        idType: effectiveIdType,
        visitorType: effectiveVisitorType,
        gender: effectiveGender,
      };

      let visitorPhotoFile: File | undefined;
      if (capturedVisitorPhoto) {
        const blob = await (await fetch(capturedVisitorPhoto)).blob();
        visitorPhotoFile = new File([blob], "visitor_photo.png", {
          type: "image/png",
        });
      }

      const savedVisitor = await registerVisitor({
        ...visitorData,
        personPhoto: visitorPhotoFile,
      });

      const purposeToCarry =
        selectedPurpose ||
        extractedInfo.purposeOfVisit ||
        "General Visit";

      const params = new URLSearchParams();
      params.set("focus", String(savedVisitor.visitorId));
      if (purposeToCarry) {
        params.set("purpose", purposeToCarry);
      }

      showToast(`Visitor registered: ${visitorData.fullName}`, {
        variant: "success",
      });

      navigate(`/dashboard/log-visitor?${params.toString()}`);
    } catch (error: any) {
      console.error("Failed to submit visitor:", error);
      showToast(error?.message || "Failed to register visitor.", {
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDiscard = () => {
    setExtractedInfo(null);
    setManualData({
      fullName: "",
      dob: "",
      idNumber: "",
    });
    setSelectedIdType("");
    setSelectedPurpose("");
    setSelectedVisitorType("");
    setSelectedGender("");
    setCapturedVisitorPhoto(null);
    setCroppedPreview(null);
    setScanPreview(null);
    setIsFrozen(false);
    stopCamera();
    stopVisitorCamera();
  };

  // Require ID type selection before opening camera
  const handleOpenCamera = () => {
    if (!selectedIdType) {
      showToast("Please select an ID type first.", { variant: "warning" });
      return;
    }
    setIsCameraModalOpen(true);
  };

  return (
    <DashboardLayout>
      {/* Header + controls */}
      <div className="mb-4">
        <div className="bg-white/5 p-4 rounded-lg shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xl font-semibold">Scan ID</p>
              <p className="text-sm text-gray-400">
                Take a clear photo of the ID; the system will handle the rest.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Button
                variation="secondary"
                onClick={() => setIsManualModalOpen(true)}
              >
                Manual Entry
              </Button>
              <Button
                variation="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={scanning}
              >
                Upload ID
              </Button>
              <Button
                variation="primary"
                onClick={handleOpenCamera}
                disabled={scanning}
              >
                Open Camera
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <Select
              id="id-type"
              value={selectedIdType}
              options={ID_TYPE_OPTIONS}
              placeholder="Select ID type"
              onChange={setSelectedIdType}
            />
          </div>

          <div className="mt-4 flex md:hidden gap-3">
            <Button
              variation="primary"
              onClick={handleOpenCamera}
              disabled={scanning}
            >
              Open Camera
            </Button>
            <Button
              variation="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
            >
              Upload ID
            </Button>
            <Button
              variation="secondary"
              onClick={() => setIsManualModalOpen(true)}
            >
              Manual Entry
            </Button>
          </div>

          {/* Hidden file input for Upload ID */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        <div className="bg-white/5 p-4 rounded-lg shadow-sm mt-4 space-y-2">
          <Select
            id="purpose"
            value={selectedPurpose}
            options={PURPOSE_OPTIONS}
            placeholder="Select purpose of visit"
            onChange={(value) => setSelectedPurpose(value)}
          />
          <Select
            id="visitor-type"
            value={selectedVisitorType}
            options={VISITOR_TYPE_OPTIONS}
            placeholder="Visitor type"
            onChange={setSelectedVisitorType}
          />
          <Select
            id="gender"
            value={selectedGender}
            options={GENDER_OPTIONS}
            placeholder="gender"
            onChange={setSelectedGender}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex mt-4 gap-6 custom-scrollbar overflow-y-scroll">
        {/* Extracted Info */}
        <div className="bg-white/4 p-4 rounded w-1/2 shadow-inner">
          <p className="text-lg font-semibold mb-3">Extracted Info</p>
          {extractedInfo ? (
            <div className="space-y-3">
              <div className="flex justify-between items-start border-b border-white/10 pb-2">
                <span className="text-sm text-gray-300">Full Name</span>
                <span className="font-medium">
                  {extractedInfo.fullName}
                </span>
              </div>

              <div className="flex justify-between items-start border-b border-white/10 pb-2">
                <span className="text-sm text-gray-300">
                  Date of Birth
                </span>
                <span className="font-medium">
                  {extractedInfo.dob}
                </span>
              </div>

              <div className="flex justify-between items-start border-b border-white/10 pb-2">
                <span className="text-sm text-gray-300">ID Number</span>
                <span className="font-medium">
                  {extractedInfo.idNumber}
                </span>
              </div>

              <div className="flex justify-between items-start border-b border-white/10 pb-2">
                <span className="text-sm text-gray-300">ID Type</span>
                <span className="font-medium">
                  {selectedIdType || extractedInfo.idType}
                </span>
              </div>

              <div className="flex justify-between items-start border-b border-white/10 pb-2">
                <span className="text-sm text-gray-300">Purpose</span>
                <span className="font-medium">
                  {selectedPurpose ||
                    extractedInfo.purposeOfVisit ||
                    "Others"}
                </span>
              </div>

              <div className="flex justify-between items-start border-b border-white/10 pb-2">
                <span className="text-sm text-gray-300">
                  Visitor Type
                </span>
                <span className="font-medium">
                  {selectedVisitorType ||
                    extractedInfo.visitorType ||
                    "Guest / Visitor"}
                </span>
              </div>

              <div className="flex justify-between items-start border-b border-white/10 pb-2">
                <span className="text-sm text-gray-300">Gender</span>
                <span className="font-medium">
                  {selectedGender ||
                    extractedInfo.gender ||
                    "Unspecified"}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No data extracted yet.</p>
          )}

          {croppedPreview && (
            <div className="mt-3 border border-white/10 rounded p-2">
              <p className="text-xs text-gray-400 mb-1">
                Debug preview – this is the image used for OCR:
              </p>
              <img
                src={croppedPreview}
                alt="Cropped ID preview"
                className="max-h-40 object-contain mx-auto rounded"
              />
            </div>
          )}
        </div>

        {/* Visitor Photo Section */}
        <div className="border p-4 rounded w-1/2 flex flex-col items-center justify-center gap-3">
          {capturedVisitorPhoto ? (
            <img
              src={capturedVisitorPhoto}
              alt="Visitor Photo"
              className="w-32 h-32 rounded-full object-cover border"
            />
          ) : (
            <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 text-sm">
              No photo
            </div>
          )}
          <Button onClick={() => setIsVisitorCameraOpen(true)}>
            {capturedVisitorPhoto ? "Retake Photo" : "Take Photo"}
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-4">
        <Button
          variation="primary"
          className="flex-1"
          onClick={handleSubmitVisitor}
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Submit Visitor"}
        </Button>
        <Button
          variation="outlined"
          className="flex-1"
          onClick={handleDiscard}
        >
          Discard
        </Button>
      </div>

      {/* ID Scan Modal */}
      <Modal
        isOpen={isCameraModalOpen}
        onClose={() => {
          setIsCameraModalOpen(false);
          setIsFrozen(false);
          setScanPreview(null);
          stopCamera();
        }}
        title="Scan ID"
      >
        <div className="flex gap-4 flex-col items-center w-full">
          {cameraError ? (
            <p className="text-red-500">{cameraError}</p>
          ) : isFrozen && scanPreview ? (
            <img
              src={scanPreview}
              alt="Captured ID frame"
              className="w-full rounded-lg"
            />
          ) : (
            <div ref={cameraContainerRef} className="relative w-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <ScanGuideOverlay containerRef={cameraContainerRef} idType={selectedIdType} />
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">
            {selectedIdType
              ? `Align your ${selectedIdType} so fields match the colored regions.`
              : 'Select an ID type for field-specific alignment guides, or scan anyway for auto-detection.'}
          </p>

          {/* Auto-capture toggle */}
          <div className="flex items-center gap-3 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCapture}
                onChange={(e) => setAutoCapture(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-yellow-500"
              />
              <span className="text-sm text-gray-300">Auto-capture when card detected</span>
            </label>
          </div>

          {/* Auto-capture status */}
          {autoCapture && autoStatus && (
            <p className="text-sm text-yellow-400 text-center animate-pulse">
              {autoStatus}
            </p>
          )}

          <Button
            id="scan-trigger-btn"
            variation="primary"
            onClick={handleScanClick}
            disabled={scanning}
            className={scanning ? "opacity-60 cursor-not-allowed" : ""}
          >
            {scanning ? "Scanning..." : "📸 Scan"}
          </Button>
        </div>
      </Modal>

      {/* Visitor Photo Modal */}
      <Modal
        isOpen={isVisitorCameraOpen}
        onClose={() => {
          stopVisitorCamera();
          setIsVisitorCameraOpen(false);
        }}
        title="Take Visitor Photo"
      >
        <div className="flex gap-4 flex-col items-center">
          {visitorCameraError ? (
            <p className="text-red-500">{visitorCameraError}</p>
          ) : (
            <video
              ref={visitorVideoRef}
              autoPlay
              playsInline
              style={{ width: "100%", borderRadius: "8px" }}
            />
          )}

          <div className="flex gap-2 mt-3">
            <Button onClick={handleCaptureVisitorPhoto}>Capture</Button>
            <Button
              className="bg-gray-500 text-white"
              onClick={() => {
                stopVisitorCamera();
                setIsVisitorCameraOpen(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Manual Entry Modal */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Manual Data Entry"
      >
        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Full Name"
            className="border rounded px-3 py-2"
            value={manualData.fullName}
            onChange={(e) =>
              setManualData((prev) => ({
                ...prev,
                fullName: e.target.value,
              }))
            }
          />
          <input
            type="date"
            placeholder="Date of Birth"
            className="border rounded px-3 py-2"
            value={manualData.dob}
            onChange={(e) =>
              setManualData((prev) => ({
                ...prev,
                dob: e.target.value,
              }))
            }
          />
          <input
            type="text"
            placeholder="ID Number"
            className="border rounded px-3 py-2"
            value={manualData.idNumber}
            onChange={(e) =>
              setManualData((prev) => ({
                ...prev,
                idNumber: e.target.value,
              }))
            }
          />

          {/* Dropdowns share the same state as the main page */}
          <Select
            id="manual-id-type"
            value={selectedIdType}
            options={ID_TYPE_OPTIONS}
            placeholder="Select ID type"
            onChange={setSelectedIdType}
          />
          <Select
            id="manual-purpose"
            value={selectedPurpose}
            options={PURPOSE_OPTIONS}
            placeholder="Select purpose of visit"
            onChange={setSelectedPurpose}
          />
          <Select
            id="manual-visitor-type"
            value={selectedVisitorType}
            options={VISITOR_TYPE_OPTIONS}
            placeholder="Visitor type"
            onChange={setSelectedVisitorType}
          />
          <Select
            id="manual-gender"
            value={selectedGender}
            options={GENDER_OPTIONS}
            placeholder="gender"
            onChange={setSelectedGender}
          />

          <div className="flex justify-end">
            <Button onClick={handleManualSave}>Save</Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
