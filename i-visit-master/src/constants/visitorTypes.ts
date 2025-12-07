// Canonical visitor type options for selects
export const VISITOR_TYPE_OPTIONS = [
  { label: "Select visitor type", value: "" },
  { label: "Guest / Visitor", value: "Guest / Visitor" },
  { label: "Student's Parent/Guardian", value: "Student's Parent/Guardian" },
  { label: "Contractor / Technician", value: "Contractor / Technician" },
  { label: "Vendor / Supplier", value: "Vendor / Supplier" },
  { label: "Media / Photographer", value: "Media / Photographer" },
  { label: "Law Enforcer / Police / Security Personnel", value: "Law Officer" },
  { label: "Other", value: "Other" },
];

// Values actually used in filters (no empty placeholder)
export const VISITOR_TYPE_FILTER_VALUES = VISITOR_TYPE_OPTIONS
  .map((o) => o.value)
  .filter((v) => v);

// Map messy historical values into the canonical ones above
export function normalizeVisitorType(raw: string | null | undefined): string {
  const val = (raw ?? "").trim().toLowerCase();
  if (!val) return "";

  if (
    val === "guest" ||
    val === "visitor" ||
    val === "guest/visitor" ||
    val === "guest / visitor"
  ) {
    return "Guest / Visitor";
  }

  if (val.includes("parent") || val.includes("guardian")) {
    return "Student's Parent/Guardian";
  }

  if (val.includes("contractor") || val.includes("technician")) {
    return "Contractor / Technician";
  }

  if (val.includes("vendor") || val.includes("supplier")) {
    return "Vendor / Supplier";
  }

  if (val.includes("media") || val.includes("photo")) {
    return "Media / Photographer";
  }

  if (
    val.includes("law") ||
    val.includes("police") ||
    val.includes("security")
  ) {
    return "Law Officer";
  }

  return "Other";
}
