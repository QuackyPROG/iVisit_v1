// src/utils/cardDetector.ts
// Utilities for detecting ID cards in camera frames for auto-capture

import { waitForOpencv } from "./opencvReady";

export interface CardDetectionResult {
    detected: boolean;
    confidence: number; // 0-1 confidence score
    area: number; // Contour area (larger = card fills more of frame)
    reason?: string;
}

/**
 * Detect if an ID card is present in the frame.
 * Returns detection result with confidence score.
 * Does NOT crop - just detects for auto-capture trigger.
 */
export async function detectCard(dataUrl: string): Promise<CardDetectionResult> {
    try {
        await waitForOpencv();
        const cv = window.cv;

        // Load image
        const img = new Image();
        img.src = dataUrl;
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = (e) => reject(e);
        });

        const canvas = document.createElement("canvas");
        canvas.width = img.width || 640;
        canvas.height = img.height || 480;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return { detected: false, confidence: 0, area: 0, reason: "Canvas error" };
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Read into OpenCV Mat
        let src = cv.imread(canvas);

        // Resize for performance
        const maxDim = 640;
        let scale = 1;
        if (src.cols > maxDim || src.rows > maxDim) {
            const fx = maxDim / src.cols;
            const fy = maxDim / src.rows;
            scale = Math.min(fx, fy);
            const dsize = new cv.Size(
                Math.round(src.cols * scale),
                Math.round(src.rows * scale)
            );
            const resized = new cv.Mat();
            cv.resize(src, resized, dsize, 0, 0, cv.INTER_AREA);
            src.delete();
            src = resized;
        }

        // Grayscale
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

        // Blur
        const blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

        // Edge detection
        const edges = new cv.Mat();
        cv.Canny(blurred, edges, 50, 150);

        // Find contours
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

        // Look for rectangular contour (4 points)
        let bestArea = 0;
        let foundCard = false;
        const frameArea = src.cols * src.rows;

        for (let i = 0; i < contours.size(); i++) {
            const cnt = contours.get(i);
            const peri = cv.arcLength(cnt, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

            if (approx.rows === 4) {
                const area = cv.contourArea(approx);
                // Card should be at least 10% of frame and at most 90%
                const areaRatio = area / frameArea;
                if (areaRatio > 0.10 && areaRatio < 0.90 && area > bestArea) {
                    bestArea = area;
                    foundCard = true;
                }
            }
            approx.delete();
            cnt.delete();
        }

        // Cleanup
        src.delete();
        gray.delete();
        blurred.delete();
        edges.delete();
        contours.delete();
        hierarchy.delete();

        // Calculate confidence based on area coverage
        const areaRatio = bestArea / frameArea;
        // Ideal is 30-60% of frame - calculate confidence
        let confidence = 0;
        if (foundCard) {
            if (areaRatio >= 0.25 && areaRatio <= 0.70) {
                confidence = 0.8 + (areaRatio * 0.3); // High confidence
            } else if (areaRatio >= 0.15) {
                confidence = 0.5 + (areaRatio * 0.5); // Medium confidence
            } else {
                confidence = areaRatio * 3; // Low confidence
            }
            confidence = Math.min(confidence, 1.0);
        }

        return {
            detected: foundCard && confidence > 0.5,
            confidence,
            area: bestArea,
            reason: foundCard ? undefined : "No rectangular card shape found",
        };
    } catch (err) {
        console.error("Card detection error:", err);
        return { detected: false, confidence: 0, area: 0, reason: String(err) };
    }
}

/**
 * Calculate image blur score using Laplacian variance.
 * Higher score = sharper image.
 */
export async function calculateBlurScore(dataUrl: string): Promise<number> {
    try {
        await waitForOpencv();
        const cv = window.cv;

        const img = new Image();
        img.src = dataUrl;
        await new Promise<void>((resolve) => {
            img.onload = () => resolve();
        });

        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return 0;
        ctx.drawImage(img, 0, 0);

        const src = cv.imread(canvas);
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

        // Calculate Laplacian
        const laplacian = new cv.Mat();
        cv.Laplacian(gray, laplacian, cv.CV_64F);

        // Calculate variance (blur score)
        const mean = new cv.Mat();
        const stddev = new cv.Mat();
        cv.meanStdDev(laplacian, mean, stddev);

        const variance = stddev.doubleAt(0, 0) ** 2;

        // Cleanup
        src.delete();
        gray.delete();
        laplacian.delete();
        mean.delete();
        stddev.delete();

        return variance;
    } catch (err) {
        console.error("Blur calculation error:", err);
        return 0;
    }
}
