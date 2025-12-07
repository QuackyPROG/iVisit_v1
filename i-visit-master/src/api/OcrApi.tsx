// src/api/OcrApi.tsx
const HELPER_BASE_URL = import.meta.env.VITE_HELPER_BASE_URL

import { recognizeImage } from "../utils/ocrClient";

export interface ExtractedInfoResponse {
  extractedText: string;
}

export async function extractText(file: File): Promise<ExtractedInfoResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${HELPER_BASE_URL}/api/ocr`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error(`OCR request failed: ${res.status}`);
  return res.json();
}

// Client-side OCR using Tesseract.js, unused due to relying on Helper App
export async function extractTextJs(file: File): Promise<ExtractedInfoResponse> {
  try {
    const text = await recognizeImage(file);
    return { extractedText: text || "" };
  } catch (err) {
    console.error("Tesseract.js OCR failed:", err);
    throw new Error("OCR request failed on client-side.");
  }
}