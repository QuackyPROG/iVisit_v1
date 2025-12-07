// src/api/VisitorLogsApi.tsx
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

import { apiFetch, NetworkError } from "./Http";
import { enqueueOperation } from "../offline/operationQueue";
import { makeClientId } from "../utils/id";

export interface VisitorLogEntryDTO {
  entryId: number;
  visitorLogId: number | null;
  visitorName: string;
  visitorType: string | null;
  stationName: string;
  guardName: string;
  passNo: string | null;
  timestamp: string; // ISO
  archived?: boolean;
  archivedAt?: string | null;
}

export interface VisitorLogDTO {
  visitorLogID: number;
  visitorID?: number;
  fullName: string;
  idType: string;
  passNo: string;
  location: string; // technically the last location too
  firstLocation?: string;
  purposeOfVisit: string;
  loggedBy: string;
  date: string; // yyyy-MM-dd
  time: string; // HH:mm:ss
  allowedStations: string[];
  archived?: boolean
  archivedAt?: string | null;
}

export interface CheckInResponse {
  message: string;
  logId: number;
  visitorId: number;
  passId: number;
  checkinTime: string;
}

export interface CheckOutResponse {
  message: string;
  visitorId: number;
  passId: number;
  checkoutTime: string;
}


export interface CheckInWithDetailsRequest {
  visitorId: number;
  passId: number | null;
  purposeOfVisit: string;
  allowedStationIds: number[];
  initialStationId?: number | null;
  guardAccountId?: number | null;
}

export interface CheckInWithDetailsResponse {
  message: string;
  logId: number;
  visitorId: number;
  passId: number;
  purposeOfVisit: string;
  allowedStationIds: number[];
}

export async function getAllLogs(): Promise<VisitorLogDTO[]> {
  const res = await fetch(`${API_BASE_URL}/api/visitorLog/all`);
  if (!res.ok) throw new Error("Failed to fetch all logs");
  return res.json();
}

export async function getActiveLogs(): Promise<VisitorLogDTO[]> {
  const res = await fetch(`${API_BASE_URL}/api/visitorLog/active`);
  if (!res.ok) throw new Error("Failed to fetch active logs");
  return res.json();
}

export async function checkInVisitor(
  visitorId: number,
  passId: number
): Promise<CheckInResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/visitorLog/checkin?visitorId=${visitorId}&passId=${passId}`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error("Failed to check in visitor");
  return res.json();
}

export async function checkOutVisitor(
  logId: number,
  stationId?: number | null,
  guardAccountId?: number | null
): Promise<void> {
  const params = new URLSearchParams();
  params.append("logId", String(logId));
  if (stationId != null) params.append("stationId", String(stationId));
  if (guardAccountId != null) params.append("guardAccountId", String(guardAccountId));

  const res = await fetch(
    `${API_BASE_URL}/api/visitorLog/checkout?${params.toString()}`,
    { method: "POST" }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to check out visitor.");
  }
}

export async function getAllLogEntries(): Promise<VisitorLogEntryDTO[]> {
  const res = await fetch(`${API_BASE_URL}/api/visitorLog/entries`);
  if (!res.ok) throw new Error("Failed to fetch log entries");
  return res.json();
}

export async function checkInWithDetails(
  payload: CheckInWithDetailsRequest
): Promise<CheckInWithDetailsResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/visitorLog/checkin-with-details`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text);
      throw new Error(parsed.error || "Failed to check in visitor (detailed)");
    } catch {
      throw new Error(text || "Failed to check in visitor (detailed)");
    }
  }

  return res.json();
}

export async function recordLogEntry(
  visitorLogId: number,
  stationId: number,
  accountId: number
): Promise<void> {
  const params = new URLSearchParams();
  params.append("visitorLogId", String(visitorLogId));
  params.append("stationId", String(stationId));
  params.append("accountId", String(accountId));

  const res = await fetch(
    `${API_BASE_URL}/api/visitorLog/record-entry?${params.toString()}`,
    { method: "POST" }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to record movement.");
  }
}



export async function grantPassToLog(
  logId: number,
  passId: number
): Promise<void> {
  const params = new URLSearchParams();
  params.append("logId", String(logId));
  params.append("passId", String(passId));

  const res = await fetch(
    `${API_BASE_URL}/api/visitorLog/grant-pass?${params.toString()}`,
    { method: "POST" }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to grant pass to visitor log.");
  }
}

export async function revokePassFromLog(logId: number): Promise<void> {
  const params = new URLSearchParams();
  params.append("logId", String(logId));

  const res = await fetch(
    `${API_BASE_URL}/api/visitorLog/revoke-pass?${params.toString()}`,
    { method: "POST" }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to revoke pass from visitor log.");
  }
}

// Offline-capable version of starting a visitor log
export interface CreateVisitorLogRequest {
  visitorId: number;
  passId?: number | null;
  purposeOfVisit: string;
  allowedStationIds: number[];
  initialStationId?: number | null;
  guardAccountId?: number | null;
  // NOTE: clientRequestId is kept only in the queue metadata,
  // not sent to the backend to avoid JSON binding issues.
}

export async function createVisitorLogResilient(
  payload: CreateVisitorLogRequest
): Promise<
  | CheckInWithDetailsResponse
  | { queued: true; clientRequestId: string }
> {
  const clientRequestId = makeClientId();

  const networkPayload: CheckInWithDetailsRequest = {
    visitorId: payload.visitorId,
    passId: payload.passId ?? null,
    purposeOfVisit: payload.purposeOfVisit,
    allowedStationIds: payload.allowedStationIds,
    initialStationId: payload.initialStationId ?? null,
    guardAccountId: payload.guardAccountId ?? null,
  };

  try {
    const res = await apiFetch("/api/visitorLog/checkin-with-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(networkPayload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to create visitor log");
    }

    // normal online case
    const data: CheckInWithDetailsResponse = await res.json();
    return data;
  } catch (err) {
    // Only queue on real network failure / timeout
    if (err instanceof NetworkError) {
      enqueueOperation({
        id: clientRequestId,
        kind: "CREATE_VISITOR_LOG",
        path: "/api/visitorLog/checkin-with-details",
        method: "POST",
        body: networkPayload, // safe for backend
        createdAt: Date.now(),
      });

      return {
        queued: true,
        clientRequestId,
      };
    }

    // Backend 4xx/5xx or other errors bubble up
    throw err;
  }
}

export interface RecordLogEntryRequest {
  visitorLogId: number;
  stationId: number;
  accountId: number;
}

/**
 * Offline-capable version of recordLogEntry.
 * - Uses apiFetch so network failures show up as NetworkError.
 * - On NetworkError, enqueues the operation instead of failing the UI.
 */
export async function recordLogEntryResilient(
  payload: RecordLogEntryRequest
): Promise<void | { queued: true; clientRequestId: string }> {
  const clientRequestId = makeClientId();

  const params = new URLSearchParams();
  params.append("visitorLogId", String(payload.visitorLogId));
  params.append("stationId", String(payload.stationId));
  params.append("accountId", String(payload.accountId));

  const path = `/api/visitorLog/record-entry?${params.toString()}`;

  try {
    const res = await apiFetch(path, {
      method: "POST",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to record movement.");
    }

    // online case: nothing to return
    return;
  } catch (err) {
    if (err instanceof NetworkError) {
      // Queue the operation for later replay
      enqueueOperation({
        id: clientRequestId,
        kind: "RECORD_LOG_ENTRY",
        path,
        method: "POST",
        body: null,          // no JSON body, everything is in the query string
        createdAt: Date.now()
      });

      return {
        queued: true,
        clientRequestId,
      };
    }

    throw err;
  }
}

export interface EndVisitorLogRequest {
  logId: number;
  stationId?: number | null;
  guardAccountId?: number | null;
}

export async function endVisitorLogResilient(
  payload: EndVisitorLogRequest
): Promise<void | { queued: true; clientRequestId: string }> {
  const clientRequestId = makeClientId();

  const params = new URLSearchParams();
  params.append("logId", String(payload.logId));
  if (payload.stationId != null) params.append("stationId", String(payload.stationId));
  if (payload.guardAccountId != null) params.append("guardAccountId", String(payload.guardAccountId));

  const path = `/api/visitorLog/checkout?${params.toString()}`;

  try {
    const res = await apiFetch(path, { method: "POST" });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to check out visitor.");
    }

    return;
  } catch (err) {
    if (err instanceof NetworkError) {
      enqueueOperation({
        id: clientRequestId,
        kind: "END_VISITOR_LOG",
        path,
        method: "POST",
        body: null,
        createdAt: Date.now(),
      });

      return { queued: true, clientRequestId };
    }

    throw err;
  }
}
