// src/utils/cardTemplates.ts

// These are the ID types you already use in ScanIdPage / idParsers
export type SupportedIdType = "National ID" | "PhilHealth ID" | "UMID";

export type RoiKey = "fullName" | "dob" | "idNumber";

export interface RoiSpec {
  key: RoiKey;
  label: string;

  // Normalized coordinates *inside the card* (0..1)
  // (0,0) = top-left of the yellow card guide, (1,1) = bottom-right.
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CardTemplate {
  idType: SupportedIdType;
  displayName: string;
  rois: RoiSpec[];
}

/**
 * Rough templates based on typical layouts.
 * These don't have to be pixel-perfect; they are mainly
 * a visual guide for the guard *and* a shared config we
 * can later use for region-based OCR.
 */
const TEMPLATES: CardTemplate[] = [
  {
    idType: "National ID",
    displayName: "Philippine National ID",
    rois: [
      {
        key: "fullName",
        label: "Last / Given / Middle",
        // Right-Side Upper
        x: 0.42,
        y: 0.28,
        width: 0.48,
        height: 0.46,
      },
      {
        key: "dob",
        label: "Date of Birth",
        // Lower-left area
        x: 0.42,
        y: 0.725,
        width: 0.48,
        height: 0.18,
      },
      {
        key: "idNumber",
        label: "ID Number",
        // Upper left
        x: 0.01,
        y: 0.24,
        width: 0.38,
        height: 0.15,
      },
    ],
  },
  {
    idType: "PhilHealth ID",
    displayName: "PhilHealth ID",
    rois: [
      {
        key: "fullName",
        label: "Full Name",
        x: 0.35,
        y: 0.4,
        width: 0.60,
        height: 0.10,
      },
      {
        key: "dob",
        label: "Date of Birth",
        x: 0.35,
        y: 0.48,
        width: 0.25,
        height: 0.07,
      },
      {
        key: "idNumber",
        label: "PhilHealth No.",
        x: 0.35,
        y: 0.33,
        width: 0.40,
        height: 0.10,
      },
    ],
  },
  {
    idType: "UMID",
    displayName: "UMID",
    rois: [
      {
        key: "fullName",
        label: "Full Name",
        x: 0.38,
        y: 0.33,
        width: 0.62,
        height: 0.38,
      },
      {
        key: "dob",
        label: "Date of Birth",
        x: 0.62,
        y: 0.675,
        width: 0.235,
        height: 0.10,
      },
      {
        key: "idNumber",
        label: "CRN / ID No.",
        x: 0.55,
        y: 0.23,
        width: 0.45,
        height: 0.12,
      },
    ],
  },
];

/**
 * Get the template (if any) for the currently selected ID type.
 */
export function getTemplateForIdType(idType: string | null | undefined): CardTemplate | null {
  if (!idType) return null;
  const tpl = TEMPLATES.find((t) => t.idType === idType);
  return tpl || null;
}
