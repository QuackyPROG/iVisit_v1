import { extractText } from "../api/Index";
import { getTemplateForIdType } from "./cardTemplates";

import {
  parseTextByIdType,
  type ExtractedInfo as BaseExtractedInfo,
  normalizeDate,
} from "./idParsers";

export type IdFieldKey = "fullName" | "dob" | "idNumber";

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
