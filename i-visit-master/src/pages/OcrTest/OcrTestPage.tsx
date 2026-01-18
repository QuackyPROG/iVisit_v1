import { useState, useRef, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import { useCamera } from '../../hooks/useCamera';
import { parseTextByIdType, detectIdType, type ExtractedInfo, type DetectedIdType } from '../../utils/idParsers';
import ScanGuideOverlay from '../../components/ocr/ScanGuideOverlay';

const HELPER_BASE_URL = import.meta.env.VITE_HELPER_BASE_URL || 'http://localhost:8765';

interface OcrResult {
    extractedText: string;
    method?: string;
    score?: number;
}

const ID_TYPE_OPTIONS = [
    { label: 'Select ID Type (or use Auto-Detect)', value: '' },
    { label: 'National ID', value: 'National ID' },
    { label: "Driver's License", value: "Driver's License" },
    { label: 'SSS ID', value: 'SSS ID' },
    { label: 'City ID / QC ID', value: 'City ID' },
    { label: 'PhilHealth ID', value: 'PhilHealth ID' },
    { label: 'UMID', value: 'UMID' },
    { label: 'School ID', value: 'School ID' },
    { label: 'Other', value: 'Other' },
];

/**
 * OCR Test Page (Updated with unified camera modal)
 * Debug interface for testing and comparing OCR results
 * Now uses the same camera modal with ROI overlay as ScanIdPage
 */
export default function OcrTestPage() {
    const { videoRef, startCamera, stopCamera, captureFrame, error: cameraError } = useCamera();

    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
    const [multipassResult, setMultipassResult] = useState<OcrResult | null>(null);
    const [parsedFields, setParsedFields] = useState<ExtractedInfo | null>(null);
    const [visionResult, setVisionResult] = useState<{ fields: Record<string, string>; model: string } | null>(null);
    const [detectedType, setDetectedType] = useState<DetectedIdType | null>(null);
    const [selectedIdType, setSelectedIdType] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    // Modal state
    const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
    const [scanPreview, setScanPreview] = useState<string | null>(null);
    const [isFrozen, setIsFrozen] = useState(false);

    const cameraContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Start/stop camera when modal opens/closes
    useEffect(() => {
        if (isCameraModalOpen) {
            startCamera();
        } else {
            stopCamera();
            setIsFrozen(false);
            setScanPreview(null);
        }
    }, [isCameraModalOpen, startCamera, stopCamera]);

    const processImage = async (dataUrl: string, file: File) => {
        setIsLoading(true);
        setOcrResult(null);
        setMultipassResult(null);
        setVisionResult(null);
        setParsedFields(null);
        setDetectedType(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Run standard OCR
            const standardRes = await fetch(`${HELPER_BASE_URL}/api/ocr`, {
                method: 'POST',
                body: formData,
            });
            const standardData = await standardRes.json();
            setOcrResult({
                extractedText: standardData.extractedText || '',
                method: 'standard',
            });

            // Run multipass OCR
            const formData2 = new FormData();
            formData2.append('file', file);
            const multipassRes = await fetch(`${HELPER_BASE_URL}/api/ocr/multipass`, {
                method: 'POST',
                body: formData2,
            });
            const multipassData = await multipassRes.json();
            setMultipassResult({
                extractedText: multipassData.extractedText || '',
                method: multipassData.method || 'unknown',
                score: multipassData.score,
            });

            // Auto-detect ID type
            const detected = detectIdType(multipassData.extractedText || '');
            setDetectedType(detected);

            // Use selected type if provided, otherwise use detected type
            const typeToUse = selectedIdType || detected.idType;

            // Try AI Vision OCR for better accuracy
            try {
                const formData3 = new FormData();
                formData3.append('file', file);

                const visionRes = await fetch(`${HELPER_BASE_URL}/api/ocr/vision`, {
                    method: 'POST',
                    body: formData3,
                });
                const visionData = await visionRes.json();

                if (visionData.fields && !visionData.error) {
                    // Use Vision results (more accurate)
                    setVisionResult({
                        fields: visionData.fields,
                        model: visionData.model || 'unknown'
                    });

                    setParsedFields({
                        fullName: visionData.fields.fullName || '',
                        idNumber: visionData.fields.idNumber || '',
                        dob: visionData.fields.dob || '',
                        idType: visionData.fields.idType || typeToUse,
                        address: visionData.fields.address || '',
                    });
                    console.log('Using AI Vision results');
                } else {
                    // Fallback to Tesseract multipass parsing
                    console.log('Vision failed, using Tesseract:', visionData.error);
                    setParsedFields(parseTextByIdType(multipassData.extractedText || '', typeToUse));
                }
            } catch (visionError) {
                // Fallback to Tesseract multipass parsing
                console.error('Vision OCR error:', visionError);
                setParsedFields(parseTextByIdType(multipassData.extractedText || '', typeToUse));
            }
        } catch (error) {
            console.error('OCR error:', error);
            setOcrResult({ extractedText: `Error: ${error}` });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCapture = async () => {
        const frame = captureFrame();
        if (!frame) return;

        // Freeze the frame in modal
        setScanPreview(frame);
        setIsFrozen(true);
        stopCamera();

        setOriginalImage(frame);

        // Convert data URL to blob/file
        const response = await fetch(frame);
        const blob = await response.blob();
        const file = new File([blob], 'test.png', { type: 'image/png' });

        // Close modal and process
        setIsCameraModalOpen(false);
        setIsFrozen(false);
        setScanPreview(null);

        await processImage(frame, file);
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Show preview
        const reader = new FileReader();
        reader.onload = async (e) => {
            const dataUrl = e.target?.result as string;
            setOriginalImage(dataUrl);
            await processImage(dataUrl, file);
        };
        reader.readAsDataURL(file);

        // Reset input so same file can be uploaded again
        event.target.value = '';
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-6xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white mb-2">OCR Test Interface</h1>
                    <p className="text-gray-400 text-sm">
                        Test OCR with unified camera modal and ROI overlay visualization
                    </p>
                </div>

                {/* ID Type Selector */}
                <div className="mb-4">
                    <Select
                        id="id-type-test"
                        value={selectedIdType}
                        options={ID_TYPE_OPTIONS}
                        placeholder="Select ID type for parsing"
                        onChange={setSelectedIdType}
                    />
                    {selectedIdType && (
                        <p className="text-xs text-cyan-400 mt-1">
                            ✓ ROI overlay will show for {selectedIdType} when camera opens
                        </p>
                    )}
                </div>

                {/* Controls */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <Button variation="primary" onClick={() => setIsCameraModalOpen(true)}>
                        📷 Open Camera
                    </Button>

                    {/* File Upload */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        className="hidden"
                    />
                    <Button
                        variation="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                    >
                        📁 Upload Image
                    </Button>

                    {originalImage && (
                        <Button
                            variation="secondary"
                            onClick={() => {
                                setOriginalImage(null);
                                setOcrResult(null);
                                setMultipassResult(null);
                                setVisionResult(null);
                                setParsedFields(null);
                                setDetectedType(null);
                            }}
                        >
                            🗑️ Clear Results
                        </Button>
                    )}
                </div>

                {/* Camera Modal */}
                <Modal
                    isOpen={isCameraModalOpen}
                    onClose={() => {
                        setIsCameraModalOpen(false);
                        setIsFrozen(false);
                        setScanPreview(null);
                        stopCamera();
                    }}
                    title="Capture ID for OCR Test"
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
                                : 'Select an ID type above for field-specific alignment guides.'}
                        </p>

                        <Button
                            variation="primary"
                            onClick={handleCapture}
                            disabled={isLoading}
                            className={isLoading ? 'opacity-60 cursor-not-allowed' : ''}
                        >
                            {isLoading ? 'Processing...' : '📸 Capture & Process'}
                        </Button>
                    </div>
                </Modal>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Captured Image */}
                    <div className="bg-gray-800 rounded-lg p-4">
                        <h3 className="text-white font-semibold mb-3">Captured Image</h3>
                        <div className="relative bg-black rounded-lg overflow-hidden">
                            {originalImage ? (
                                <img
                                    src={originalImage}
                                    alt="Captured"
                                    className="w-full aspect-video object-contain"
                                />
                            ) : (
                                <div className="w-full aspect-video flex items-center justify-center text-gray-500">
                                    Click "Open Camera" or "Upload Image" to begin
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: OCR Results Comparison */}
                    <div className="space-y-4">
                        {/* Standard OCR Result */}
                        <div className="bg-gray-800 rounded-lg p-4">
                            <h3 className="text-white font-semibold mb-2">
                                Standard OCR
                                <span className="text-gray-400 text-sm ml-2">(single pass)</span>
                            </h3>
                            <pre className="bg-black/50 p-3 rounded text-sm text-gray-300 whitespace-pre-wrap min-h-[120px] max-h-[200px] overflow-auto">
                                {ocrResult?.extractedText || (isLoading ? 'Processing...' : 'No result yet')}
                            </pre>
                        </div>

                        {/* Multipass OCR Result */}
                        <div className="bg-gray-800 rounded-lg p-4">
                            <h3 className="text-white font-semibold mb-2">
                                Multi-pass OCR
                                {multipassResult?.method && (
                                    <span className="text-green-400 text-sm ml-2">
                                        (best: {multipassResult.method}, score: {multipassResult.score})
                                    </span>
                                )}
                            </h3>
                            <pre className="bg-black/50 p-3 rounded text-sm text-gray-300 whitespace-pre-wrap min-h-[120px] max-h-[200px] overflow-auto">
                                {multipassResult?.extractedText || (isLoading ? 'Processing...' : 'No result yet')}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Vision OCR Result */}
                {visionResult && (
                    <div className="mt-6 bg-purple-900/30 border-2 border-purple-500 rounded-lg p-4">
                        <h3 className="text-purple-400 font-bold mb-3 text-lg">
                            🤖 AI Vision OCR
                            <span className="text-purple-300 text-sm ml-2">({visionResult.model})</span>
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {Object.entries(visionResult.fields).map(([key, value]) => (
                                <div key={key} className="bg-purple-900/20 p-2 rounded">
                                    <span className="text-purple-300 text-xs uppercase">{key}</span>
                                    <p className="text-white font-semibold">{value || '—'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Auto-Detected ID Type - YELLOW highlight */}
                {detectedType && (
                    <div className="mt-6 bg-yellow-900/30 border-2 border-yellow-500 rounded-lg p-4">
                        <h3 className="text-yellow-400 font-bold mb-3 text-lg">🔍 Auto-Detected ID Type</h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-4">
                                <span className="text-yellow-300 font-semibold">Detected Type:</span>
                                <span className="text-white font-bold text-xl">{detectedType.idType}</span>
                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${detectedType.confidence >= 0.9 ? 'bg-green-600 text-white' :
                                    detectedType.confidence >= 0.7 ? 'bg-yellow-600 text-white' :
                                        'bg-red-600 text-white'
                                    }`}>
                                    {Math.round(detectedType.confidence * 100)}% confidence
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="text-yellow-300 text-sm">Matched patterns:</span>
                                {detectedType.matchedPatterns.map((pattern, i) => (
                                    <span key={i} className="bg-yellow-800/50 text-yellow-200 px-2 py-1 rounded text-xs">
                                        {pattern}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Parsed ID Fields - RED styling as requested */}
                {parsedFields && (
                    <div className="mt-6 bg-red-900/20 border border-red-500 rounded-lg p-4">
                        <h3 className="text-red-400 font-bold mb-3 text-lg">Parsed ID Fields ({parsedFields.idType})</h3>
                        <div className="space-y-2">
                            <div className="flex">
                                <span className="text-red-300 font-semibold w-32">Full Name:</span>
                                <span className="text-white font-bold">{parsedFields.fullName || '—'}</span>
                            </div>
                            <div className="flex">
                                <span className="text-red-300 font-semibold w-32">ID Number:</span>
                                <span className="text-white font-bold">{parsedFields.idNumber || '—'}</span>
                            </div>
                            <div className="flex">
                                <span className="text-red-300 font-semibold w-32">Date of Birth:</span>
                                <span className="text-white font-bold">{parsedFields.dob || '—'}</span>
                            </div>
                            {parsedFields.address && (
                                <div className="flex">
                                    <span className="text-red-300 font-semibold w-32">Address:</span>
                                    <span className="text-white font-bold">{parsedFields.address}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ROI Legend */}
                <div className="mt-6 bg-gray-800 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-3">ROI Overlay Colors</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#00BFFF' }}></div>
                            <span className="text-gray-300">Full Name</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FF00FF' }}></div>
                            <span className="text-gray-300">ID Number</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FFD700' }}></div>
                            <span className="text-gray-300">Date of Birth</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#00FF7F' }}></div>
                            <span className="text-gray-300">Institution</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#FF6347' }}></div>
                            <span className="text-gray-300">Faculty</span>
                        </div>
                    </div>
                </div>

                {/* Active Improvements Summary */}
                <div className="mt-6 bg-gray-800 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-3">Active Improvements</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        <div className="bg-green-900/30 text-green-400 px-3 py-2 rounded">
                            ✓ Resolution: 1200px
                        </div>
                        <div className="bg-green-900/30 text-green-400 px-3 py-2 rounded">
                            ✓ Sharpening Filter
                        </div>
                        <div className="bg-green-900/30 text-green-400 px-3 py-2 rounded">
                            ✓ Character Correction
                        </div>
                        <div className="bg-green-900/30 text-green-400 px-3 py-2 rounded">
                            ✓ Adaptive Lighting
                        </div>
                        <div className="bg-green-900/30 text-green-400 px-3 py-2 rounded">
                            ✓ ROI Overlay Guide
                        </div>
                        <div className="bg-green-900/30 text-green-400 px-3 py-2 rounded">
                            ✓ Multi-pass OCR
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
