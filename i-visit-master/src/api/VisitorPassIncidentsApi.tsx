// src/api/VisitorPassIncidentsApi.tsx
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface VisitorPassIncident {
  incidentId: number;

  passId: number;
  passDisplayCode?: string;
  passNumber?: string;

  visitorId?: number;
  visitorName?: string;

  visitorLogId?: number;

  stationId?: number;
  stationName?: string;

  guardAccountId?: number;
  guardName?: string;

  incidentType: string;   // LOST, DAMAGED, NOT_RETURNED, OTHER
  description?: string;

  status: string;         // OPEN, CLOSED
  reportedAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface VisitorPassIncidentRequest {
  passId: number;
  visitorId?: number;
  visitorLogId?: number;
  stationId?: number;
  guardAccountId?: number;
  incidentType: string;
  description?: string;
}

export async function reportPassIncident(
  payload: VisitorPassIncidentRequest
): Promise<VisitorPassIncident> {
  const res = await fetch(`${API_BASE_URL}/api/visitorPassIncident`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to report visitor pass incident.");
  }

  return res.json();
}

export async function listPassIncidents(
  status?: string
): Promise<VisitorPassIncident[]> {
  const url = status
    ? `${API_BASE_URL}/api/visitorPassIncident?status=${encodeURIComponent(
      status
    )}`
    : `${API_BASE_URL}/api/visitorPassIncident`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load visitor pass incidents.");
  return res.json();
}

export async function closePassIncident(
  incidentId: number,
  notes?: string
): Promise<VisitorPassIncident> {
  const res = await fetch(
    `${API_BASE_URL}/api/visitorPassIncident/${incidentId}/close`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to close incident.");
  }

  return res.json();
}
