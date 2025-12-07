// src/utils/activityFormatter.ts
import dayjs from "dayjs";
import type { VisitorLogEntryDTO } from "../api/VisitorLogsApi";

/**
 * Turn a VisitorLogEntryDTO into a human-readable activity message.
 * This stays neutral about direction (no "entered"/"exited"),
 * but is smart about gate vs building stations, missing pass, etc.
 */
export function formatActivityMessage(entry: VisitorLogEntryDTO): string {
  const {
    visitorName,
    visitorType,
    stationName,
    guardName,
    passNo,
    timestamp,
  } = entry;

  // --- Visitor label ---
  const name = visitorName || "Unknown visitor";
  const whoLabel = visitorType
    ? `${visitorType}, ${name}`
    : `Visitor, ${name}`;

  // --- Station label ---
  const stationLabel = stationName || "Unknown station";

  // --- Time label (absolute) ---
  let timeStr = "an unknown time";
  if (timestamp) {
    const d = dayjs(timestamp);
    if (d.isValid()) {
      timeStr = d.format("hh:mm A on MMM DD, YYYY");
    }
  }

  // --- Pass label: ignore placeholders like "-" / "—" ---
  const normalizedPass =
    passNo && passNo !== "-" && passNo !== "—" ? passNo : null;

  const passPart = normalizedPass
    ? ` using Visitor Pass ${normalizedPass}`
    : "";

  // --- Guard label (fallback to "System") ---
  const guardLabel =
    guardName && guardName !== "System"
      ? `Guard ${guardName}`
      : "System";

  // --- Gate vs internal station behavior ---
  const isGate = stationLabel.toLowerCase().includes("gate");

  if (isGate) {
    // Neutral wording for gate events (works for both entry & exit)
    return `${whoLabel} was processed at ${stationLabel} at ${timeStr}${passPart}. ${guardLabel} logged this movement.`;
  }

  // Building / internal station-style message
  return `${whoLabel} was recorded at ${stationLabel} at ${timeStr}${passPart}. ${guardLabel} was stationed here at that time.`;
}
