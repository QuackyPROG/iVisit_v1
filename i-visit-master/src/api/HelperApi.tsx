// src/api/HelperApi.tsx
const HELPER_BASE_URL = import.meta.env.VITE_HELPER_BASE_URL

export interface StationInfo {
  stationId: number;
}

export async function getStationInfo(): Promise<StationInfo | null> {
  try {
    const res = await fetch(`${HELPER_BASE_URL}/api/station`);
    if (!res.ok) return null;

    const json = await res.json();
    const id = Number(json.stationId);
    if (Number.isNaN(id)) return null;

    return { stationId: id };
  } catch (err) {
    console.warn("Failed to reach helper app:", err);
    return null;
  }
}

export async function setStationInfo(stationId: number): Promise<void> {
  const res = await fetch(`${HELPER_BASE_URL}/api/station`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stationId }),
  });

  if (!res.ok) {
    let message = "Failed to update station in helper app.";
    try {
      const text = await res.text();
      if (text) message = text;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
}

// for polling the RFID scanner status
export interface ScannerStatus {
  ok: boolean;
  message: string;
  readerNames?: string[];
}

/**
 * Returns:
 * - null           -> helper not reachable at all
 * - { ok: true }   -> helper reachable + RFID scanner OK
 * - { ok: false }  -> helper reachable, but some scanner error (e.g. list() failed)
 */
export async function getScannerStatus(): Promise<ScannerStatus | null> {
  try {
    const res = await fetch(`${HELPER_BASE_URL}/api/scanner-status`);
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.warn("Failed to reach helper scanner-status:", err);
    return null;
  }
}