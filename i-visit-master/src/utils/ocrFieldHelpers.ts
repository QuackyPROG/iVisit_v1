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

  let cleaned = text
    .replace(/O/g, "0")
    .replace(/[Il]/g, "1")
    .replace(/\s+/g, " ")
    .trim();

  const cleaned12 = cleaned.replace(/PSN[-–\s]*/gi, '');
  const match12 = cleaned12.match(
    /(\d{4})[-–\s]*(\d{3,4})[-–\s]*(\d{4})[-–\s]*(\d{1,4})/
  );
  if (match12) {
    return `${match12[1]}-${match12[2]}-${match12[3]}-${match12[4]}`;
  }

  const match16 = cleaned.match(
    /\b\d{4}\s*-\s*\d{4}\s*-\s*\d{4}\s*-\s*\d{4}\b/
  );
  if (match16) {
    const digits = match16[0].replace(/\D+/g, "");
    if (digits.length === 16) {
      return [
        digits.slice(0, 4),
        digits.slice(4, 8),
        digits.slice(8, 12),
        digits.slice(12),
      ].join("-");
    }
  }

  return "";
}

export function extractDobFromText(text: string): string {
  if (!text) return "";
  const norm = normalizeDate(text);
  return norm || "";
}

export function extractPhilHealthIdNumber(text: string): string {
  if (!text) return "";

  let cleaned = text
    .replace(/O/gi, "0")
    .replace(/[Il]/g, "1")
    .replace(/S/gi, "5")
    .replace(/B/gi, "8")
    .replace(/\s+/g, "")
    .trim();

  const match = cleaned.match(/(\d{2})\s*-?\s*(\d{9})\s*-?\s*(\d{1})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const digitsOnly = cleaned.replace(/\D/g, "");
  if (digitsOnly.length >= 12) {
    const d = digitsOnly.slice(0, 12);
    return `${d.slice(0, 2)}-${d.slice(2, 11)}-${d.slice(11)}`;
  }

  return cleaned.replace(/[^\d-]/g, "");
}

export function extractSssIdNumber(text: string): string {
  if (!text) return "";

  let cleaned = text
    .replace(/O/gi, "0")
    .replace(/[Il]/g, "1")
    .replace(/S/gi, "5")
    .replace(/B/gi, "8")
    .replace(/\s+/g, "")
    .trim();

  const match = cleaned.match(/(\d{2})\s*-?\s*(\d{7})\s*-?\s*(\d{1})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const digitsOnly = cleaned.replace(/\D/g, "");
  if (digitsOnly.length >= 10) {
    const d = digitsOnly.slice(0, 10);
    return `${d.slice(0, 2)}-${d.slice(2, 9)}-${d.slice(9)}`;
  }

  return cleaned.replace(/[^\d-]/g, "");
}

export function correctOcrMistakes(text: string): string {
  if (!text) return "";

  let result = text;

  result = result.replace(/([A-Za-z])0([A-Za-z])/g, '$1O$2');
  result = result.replace(/([A-Za-z])1([A-Za-z])/g, '$1I$2');
  result = result.replace(/([A-Za-z])5([A-Za-z])/g, '$1S$2');
  result = result.replace(/([A-Za-z])8([A-Za-z])/g, '$1B$2');

  result = result.replace(/^0([A-Za-z])/g, 'O$1');
  result = result.replace(/([A-Za-z])0$/g, '$1O');
  result = result.replace(/^1([A-Za-z])/g, 'I$1');
  result = result.replace(/([A-Za-z])1$/g, '$1I');

  return result;
}

export function correctNameOcr(name: string): string {
  if (!name) return "";

  let result = name
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/5/g, 'S')
    .replace(/8/g, 'B');

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
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], 'id-card.png', { type: 'image/png' });

    const formData = new FormData();
    formData.append('file', file);

    console.log('[OCR] Trying OpenRouter Vision...');
    const visionRes = await fetch(`${HELPER_BASE_URL}/api/ocr/vision`, {
      method: 'POST',
      body: formData,
    });

    if (visionRes.ok) {
      const visionData = await visionRes.json();

      if (visionData.fields && !visionData.error) {
        console.log('[OCR] OpenRouter Vision success:', visionData.fields);
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
      console.warn('[OCR] OpenRouter returned no fields:', visionData.error);
    } else {
      console.warn('[OCR] OpenRouter request failed:', visionRes.status);
    }

    console.log('[OCR] Trying OCR.space fallback...');
    const formData2 = new FormData();
    formData2.append('file', file);

    const ocrSpaceRes = await fetch(`${HELPER_BASE_URL}/api/ocr/ocrspace`, {
      method: 'POST',
      body: formData2,
    });

    if (ocrSpaceRes.ok) {
      const ocrSpaceData = await ocrSpaceRes.json();

      if (ocrSpaceData.success && ocrSpaceData.fields) {
        console.log('[OCR] OCR.space success:', ocrSpaceData.fields);
        return {
          fullName: ocrSpaceData.fields.fullName || '',
          idNumber: ocrSpaceData.fields.idNumber || '',
          dob: ocrSpaceData.fields.dob || '',
          address: ocrSpaceData.fields.address || '',
          idType: ocrSpaceData.fields.idType || '',
          gender: '',
          success: true,
        };
      }
      console.warn('[OCR] OCR.space returned no fields');
    } else {
      console.warn('[OCR] OCR.space request failed:', ocrSpaceRes.status);
    }

    console.warn('[OCR] All OCR methods failed, falling back to Tesseract');
    return emptyResult;
  } catch (err) {
    console.error('[OCR] Error:', err);
    return emptyResult;
  }
}

