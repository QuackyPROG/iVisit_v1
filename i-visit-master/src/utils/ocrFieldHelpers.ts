import { extractText } from "../api/Index";
import { getTemplateForIdType } from "./cardTemplates";

import {
  parseTextByIdType,
  type ExtractedInfo as BaseExtractedInfo,
  normalizeDate,
} from "./idParsers";

export type IdFieldKey = "fullName" | "dob" | "idNumber" | "institution" | "faculty";

export interface FieldRoi {
  key: IdFieldKey;
  x: number;   // 0–1, relative to card width
  y: number;   // 0–1, relative to card height
  width: number;  // 0–1
  height: number; // 0–1
}

export async function cropFieldsFromCard(
  cardDataUrl: string,
  rois: FieldRoi[]
): Promise<Partial<Record<IdFieldKey, string>>> {
  if (!rois.length) return {};

  const img = new Image();
  img.src = cardDataUrl;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(e);
  });

  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = img.width || 640;
  baseCanvas.height = img.height || 480;
  const baseCtx = baseCanvas.getContext("2d");
  if (!baseCtx) throw new Error("Failed to get 2D context");

  baseCtx.drawImage(img, 0, 0, baseCanvas.width, baseCanvas.height);

  const result: Partial<Record<IdFieldKey, string>> = {};

  for (const roi of rois) {
    const sx = roi.x * baseCanvas.width;
    const sy = roi.y * baseCanvas.height;
    const sw = roi.width * baseCanvas.width;
    const sh = roi.height * baseCanvas.height;

    const fieldCanvas = document.createElement("canvas");
    fieldCanvas.width = sw;
    fieldCanvas.height = sh;
    const fieldCtx = fieldCanvas.getContext("2d");
    if (!fieldCtx) continue;

    fieldCtx.drawImage(
      baseCanvas,
      sx,
      sy,
      sw,
      sh,
      0,
      0,
      sw,
      sh
    );

    const fieldDataUrl = fieldCanvas.toDataURL("image/png");
    result[roi.key] = fieldDataUrl;
  }

  return result;
}

export function extractNationalIdNumber(text: string): string {
  if (!text) return "";

  // Normalize some common OCR mistakes and whitespace
  let cleaned = text
    .replace(/O/g, "0")
    .replace(/[Il]/g, "1")
    .replace(/\s+/g, " ")
    .trim();

  // Look for a pattern like 1234-5678-9012-3456 (allow spaces around dashes)
  const match = cleaned.match(
    /\b\d{4}\s*-\s*\d{4}\s*-\s*\d{4}\s*-\s*\d{4}\b/
  );
  if (!match) return "";

  // Strip non-digits and ensure we really have 16 digits
  const digits = match[0].replace(/\D+/g, "");
  if (digits.length !== 16) return "";

  // Return canonical format
  return [
    digits.slice(0, 4),
    digits.slice(4, 8),
    digits.slice(8, 12),
    digits.slice(12),
  ].join("-");
}

export function extractDobFromText(text: string): string {
  if (!text) return "";
  const norm = normalizeDate(text);
  return norm || "";
}

/**
 * Fix common OCR character confusion errors (Sprint 03)
 * Uses context to determine if a character should be a letter or number
 */
export function correctOcrMistakes(text: string): string {
  if (!text) return "";

  let result = text;

  // In name contexts (mostly letters), fix number→letter substitutions
  // Pattern: number surrounded by letters
  result = result.replace(/([A-Za-z])0([A-Za-z])/g, '$1O$2'); // 0 → O
  result = result.replace(/([A-Za-z])1([A-Za-z])/g, '$1I$2'); // 1 → I
  result = result.replace(/([A-Za-z])5([A-Za-z])/g, '$1S$2'); // 5 → S
  result = result.replace(/([A-Za-z])8([A-Za-z])/g, '$1B$2'); // 8 → B

  // Leading/trailing fixes for names
  result = result.replace(/^0([A-Za-z])/g, 'O$1');  // 0 at start
  result = result.replace(/([A-Za-z])0$/g, '$1O');  // 0 at end
  result = result.replace(/^1([A-Za-z])/g, 'I$1');  // 1 at start
  result = result.replace(/([A-Za-z])1$/g, '$1I');  // 1 at end

  return result;
}

/**
 * Correct name-specific OCR errors (Sprint 03)
 * More aggressive correction for name fields where we expect all letters
 */
export function correctNameOcr(name: string): string {
  if (!name) return "";

  // Names are typically all letters, so be more aggressive
  let result = name
    .replace(/0/g, 'O')   // All zeros become O
    .replace(/1/g, 'I')   // All ones become I
    .replace(/5/g, 'S')   // All fives become S (common: 5ANTOS → SANTOS)
    .replace(/8/g, 'B');  // All eights become B

  // Fix common Filipino name patterns
  result = result
    .replace(/DE1A/gi, 'DELA')
    .replace(/DE L4/gi, 'DE LA')
    .replace(/D3/gi, 'DE')
    .replace(/CR[U0]Z/gi, 'CRUZ')
    .replace(/5ANT[O0]S/gi, 'SANTOS')
    .replace(/8A[U0]TISTA/gi, 'BAUTISTA')
    .replace(/R[E3]Y[E3]S/gi, 'REYES')
    .replace(/GARC1A/gi, 'GARCIA');

  return result;
}

export function cleanRoiName(text: string): string {
  if (!text) return "";

  // Drop line breaks & compress spaces
  let cleaned = text.replace(/\s+/g, " ").trim();

  // Remove obvious label words that your cards use
  cleaned = cleaned.replace(
    /(Apelyido|Last\s*Name|Mga\s*Pangalan|Given\s*Names|Gitnang\s*Apelyido|Middle\s*Name|Petsa\s*ng\s*Kapanganakan|Date\s*of\s*Birth)/gi,
    " "
  );

  // Remove obvious date-like fragments that leaked into the name ROI
  cleaned = cleaned.replace(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s+\d{4}/gi,
    " "
  );

  // Compress spaces again
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Apply character correction for names (Sprint 03)
  cleaned = correctNameOcr(cleaned);

  return cleaned;
}

export async function runWholeCardOcrAndParse(
  cardDataUrl: string,
  idType: string
): Promise<BaseExtractedInfo> {
  const blob = await (await fetch(cardDataUrl)).blob();
  const file = new File([blob], "full_card.png", { type: "image/png" });
  const json = await extractText(file);
  const extractedText: string = json.extractedText || "";
  return parseTextByIdType(extractedText, idType);
}

export async function ocrDataUrlViaHelper(dataUrl: string): Promise<string> {
  const responseBlob = await (await fetch(dataUrl)).blob();
  const file = new File([responseBlob], "field.png", { type: "image/png" });
  const json = await extractText(file); // uses your helper /api/ocr (Tess4J)
  return json.extractedText || "";
}

export function getRoisForIdType(idType: string): FieldRoi[] {
  const tpl = getTemplateForIdType(idType);
  if (!tpl || !tpl.rois || tpl.rois.length === 0) return [];

  // Adapt RoiSpec to FieldRoi (they're effectively the same shape)
  return tpl.rois.map((r) => ({
    key: r.key as IdFieldKey,
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
  }));
}

// ========== AI VISION OCR (OpenRouter via Helper) ==========

const HELPER_BASE_URL = import.meta.env.VITE_HELPER_BASE_URL || 'http://localhost:8765';

export interface VisionExtractResult {
  fullName: string;
  idNumber: string;
  dob: string;
  address: string;
  idType: string;
  gender: string;
  success: boolean;
}

/**
 * Call AI Vision OCR (OpenRouter via helper) for accurate ID extraction.
 * @param dataUrl Base64 image data URL
 * @returns Extracted fields or empty result on failure
 */
export async function visionOcrExtract(dataUrl: string): Promise<VisionExtractResult> {
  const emptyResult: VisionExtractResult = {
    fullName: '',
    idNumber: '',
    dob: '',
    address: '',
    idType: '',
    gender: '',
    success: false,
  };

  try {
    // Convert data URL to blob/file
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], 'id-card.png', { type: 'image/png' });

    const formData = new FormData();
    formData.append('file', file);

    const visionRes = await fetch(`${HELPER_BASE_URL}/api/ocr/vision`, {
      method: 'POST',
      body: formData,
    });

    if (!visionRes.ok) {
      console.warn('Vision OCR request failed:', visionRes.status);
      return emptyResult;
    }

    const visionData = await visionRes.json();

    if (visionData.fields && !visionData.error) {
      console.log('Vision OCR success:', visionData.fields);
      return {
        fullName: visionData.fields.fullName || '',
        idNumber: visionData.fields.idNumber || '',
        dob: visionData.fields.dob || '',
        address: visionData.fields.address || '',
        idType: visionData.fields.idType || '',
        gender: visionData.fields.gender || '',
        success: true,
      };
    }

    console.warn('Vision OCR returned no fields:', visionData.error);
    return emptyResult;
  } catch (err) {
    console.error('Vision OCR error:', err);
    return emptyResult;
  }
}
