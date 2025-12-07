// src/api/VisitorPassesApi.tsx
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export interface VisitorPass {
  passID: number;
  passNumber: string;
  visitorPassID?: string;
  status: string;
  displayCode?: string;
  originLocation?: string;
  originStationId?: number | null
}

// Helper to build the best label for UI
export function getPassLabel(pass: VisitorPass): string {
  return (
    pass.displayCode ||
    pass.passNumber ||
    `#${pass.passID}`
  );
}

export async function createPass(
  passNumber: number | string,
  visitorPassID?: string,
  status: string = "AVAILABLE"
): Promise<VisitorPass> {
  const params = new URLSearchParams();
  params.append("passNumber", String(passNumber));
  if (visitorPassID) params.append("visitorPassID", visitorPassID);
  params.append("status", status);

  const res = await fetch(
    `${API_BASE_URL}/api/visitorPass?${params.toString()}`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error("Failed to create pass");
  return res.json();
}

export async function getPassByUid(uid: string): Promise<VisitorPass> {
  const res = await fetch(
    `${API_BASE_URL}/api/visitorPass/by-uid/${encodeURIComponent(uid)}`
  );

  if (!res.ok) {
    const text = await res.text();

    if (res.status === 404) {
      throw new Error(text || "No visitor pass registered for this card.");
    }

    // For 409 (LOST/INACTIVE/RETIRED) and any other errors
    throw new Error(text || "Failed to look up RFID pass.");
  }

  return res.json();
}

export async function getAllPasses(): Promise<VisitorPass[]> {
  const res = await fetch(`${API_BASE_URL}/api/visitorPass`);
  if (!res.ok) throw new Error("Failed to fetch passes");
  return res.json();
}

export async function getAvailablePasses(): Promise<VisitorPass[]> {
  const res = await fetch(`${API_BASE_URL}/api/visitorPass/available`);
  if (!res.ok) throw new Error("Failed to fetch available passes");
  return res.json();
}

export async function updatePassStatus(
  passId: number,
  status: string
): Promise<VisitorPass> {
  const params = new URLSearchParams();
  params.append("status", status);

  const res = await fetch(
    `${API_BASE_URL}/api/visitorPass/${passId}/status?${params.toString()}`,
    { method: "PUT" }
  );
  if (!res.ok) throw new Error(await res.text() || "Failed to update pass status");
  return res.json();
}

export async function updatePassMetadata(
  passId: number,
  data: {
    displayCode?: string;
    originLocation?: string;
    visitorPassID?: string;
    originStationId?: number | null;
  }
): Promise<VisitorPass> {
  const res = await fetch(`${API_BASE_URL}/api/visitorPass/${passId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text() || "Failed to update pass");
  return res.json();
}

export async function deletePass(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/visitorPass/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text() || "Failed to delete/deactivate pass");
}
