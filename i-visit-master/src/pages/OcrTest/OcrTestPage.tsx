import { useState, useRef } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import { useCamera } from '../../hooks/useCamera';
import { parseTextByIdType, detectIdType, type ExtractedInfo, type DetectedIdType } from '../../utils/idParsers';

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
 * OCR Test Page (Sprint 07)
 * Debug interface for testing and comparing OCR results
 * Only visible when VITE_OCR_DEBUG_MODE=true
 */
export default function OcrTestPage() {
    const { videoRef, startCamera, stopCamera, captureFrame, error: cameraError } = useCamera();

    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
    const [multipassResult, setMultipassResult] = useState<OcrResult | null>(null);
    const [parsedFields, setParsedFields] = useState<ExtractedInfo | null>(null);
    const [detectedType, setDetectedType] = useState<DetectedIdType | null>(null);
    const [selectedIdType, setSelectedIdType] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    const handleStartCamera = async () => {
        await startCamera();
        setCameraActive(true);
    };

    const handleStopCamera = () => {
        stopCamera();
        setCameraActive(false);
    };

    const handleCapture = async () => {
        const frame = captureFrame();
        if (!frame) return;

        setOriginalImage(frame);
        setIsLoading(true);
        setOcrResult(null);
        setMultipassResult(null);

        try {
            // Convert data URL to blob
            const response = await fetch(frame);
            const blob = await response.blob();
            const file = new File([blob], 'test.png', { type: 'image/png' });
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
            setParsedFields(parseTextByIdType(multipassData.extractedText || '', typeToUse));

        } catch (error) {
            console.error('OCR error:', error);
            setOcrResult({ extractedText: `Error: ${error}` });
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Show preview
        const reader = new FileReader();
        reader.onload = async (e) => {
            const dataUrl = e.target?.result as string;
            setOriginalImage(dataUrl);

            // Process through OCR
            setIsLoading(true);
            setOcrResult(null);
            setMultipassResult(null);

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
                setParsedFields(parseTextByIdType(multipassData.extractedText || '', typeToUse));
            } catch (error) {
                console.error('OCR error:', error);
                setOcrResult({ extractedText: `Error: ${error}` });
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsDataURL(file);

        // Reset input so same file can be uploaded again
        event.target.value = '';
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <DashboardLayout>
            <div className="p-6 max-w-6xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white mb-2">OCR Test Interface</h1>
                    <p className="text-yellow-400 text-sm">
                        ⚠️ Debug mode - This page is only visible in development
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
                </div>

                {/* Controls */}
                <div className="flex flex-wrap gap-3 mb-6">
                    {!cameraActive ? (
                        <Button variation="primary" onClick={handleStartCamera}>
                            Start Camera
                        </Button>
                    ) : (
                        <Button variation="secondary" onClick={handleStopCamera}>
                            Stop Camera
                        </Button>
                    )}
                    <Button
                        variation="primary"
                        onClick={handleCapture}
                        disabled={!cameraActive || isLoading}
                    >
                        {isLoading ? 'Processing...' : 'Capture & Compare'}
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
                </div>

                {cameraError && (
                    <p className="text-red-500 mb-4">{cameraError}</p>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Camera / Captured Image */}
                    <div className="bg-gray-800 rounded-lg p-4">
                        <h3 className="text-white font-semibold mb-3">Camera / Captured Image</h3>
                        <div ref={containerRef} className="relative bg-black rounded-lg overflow-hidden">
                            {cameraActive && !originalImage ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full aspect-video object-cover"
                                />
                            ) : originalImage ? (
                                <img
                                    src={originalImage}
                                    alt="Captured"
                                    className="w-full aspect-video object-contain"
                                />
                            ) : (
                                <div className="w-full aspect-video flex items-center justify-center text-gray-500">
                                    Start camera to begin testing
                                </div>
                            )}
                        </div>
                        {originalImage && (
                            <Button
                                variation="secondary"
                                className="mt-3"
                                onClick={() => setOriginalImage(null)}
                            >
                                Clear Image
                            </Button>
                        )}
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
                        <h3 className="text-red-400 font-bold mb-3 text-lg">📋 Parsed ID Fields ({parsedFields.idType})</h3>
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

                {/* Improvements Summary */}
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
                            ✓ Visual Guide
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
