// src/api/StationsApi.tsx
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface AssignedUser {
  id: number;
  username: string;
  accountType: string;
}

export interface StationDTO {
  stationID: number;
  stationName: string;
  active?: boolean | null;
  stationActive?: boolean | null;
  stationType?: string | null;
}

export type StationType = "gate" | "building" | null;

export interface Station {
  id: number;
  name: string;
  active?: boolean | null;
  stationType?: StationType;
  assignedUsers?: AssignedUser[];
}

function normalizeStationType(raw: unknown): StationType {
  if (!raw) return null;
  const v = String(raw).toLowerCase();
  if (v === "gate" || v === "building") return v;
  return null;
}

export async function getAllStations(): Promise<Station[]> {
  const res = await fetch(`${API_BASE_URL}/api/stations`);
  if (!res.ok) {
    throw new Error("Failed to fetch stations");
  }

  const dtos: StationDTO[] = await res.json();
  return dtos.map((dto) => ({
    id: dto.stationID,
    name: dto.stationName,
    active: dto.active ?? dto.stationActive ?? true,
    stationType: normalizeStationType(dto.stationType),
  }));
}

export async function getStationById(id: number): Promise<Station> {
  const res = await fetch(`${API_BASE_URL}/api/stations/${id}`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to fetch station by ID");
  }

  const dto: StationDTO = await res.json();
  return {
    id: dto.stationID,
    name: dto.stationName,
    active: dto.active ?? dto.stationActive ?? true,
    stationType: normalizeStationType(dto.stationType),
  };
}

export async function createStation(payload: {
  name: string;
  active?: boolean;
  stationType?: StationType;
}): Promise<Station> {
  const stationType = normalizeStationType(payload.stationType) ?? "gate";

  const res = await fetch(`${API_BASE_URL}/api/stations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: payload.name,
      active: payload.active ?? true,
      type: stationType,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to create station.");
  }

  const dto: StationDTO = await res.json();
  return {
    id: dto.stationID,
    name: dto.stationName,
    active: dto.active ?? dto.stationActive ?? true,
    stationType: normalizeStationType(dto.stationType ?? stationType),
  };
}

export async function updateStation(station: Station): Promise<Station> {
  const normalizedType = normalizeStationType(station.stationType);

  const payload: any = {
    name: station.name,
    active: station.active,
  };

  // Only send type when we actually intend to set/change it
  if (normalizedType) {
    payload.type = normalizedType;
  }

  const res = await fetch(`${API_BASE_URL}/api/stations/${station.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to update station");
  }

  const dto: StationDTO = await res.json();
  return {
    id: dto.stationID,
    name: dto.stationName,
    active: dto.active ?? dto.stationActive ?? true,
    stationType: normalizeStationType(dto.stationType ?? station.stationType),
  };
}

export async function setStationActive(
  stationId: number,
  active: boolean
): Promise<Station> {
  const res = await fetch(`${API_BASE_URL}/api/stations/${stationId}/active`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to update station status.");
  }
  const dto: StationDTO = await res.json();
  return {
    id: dto.stationID,
    name: dto.stationName,
    active: dto.active ?? dto.stationActive ?? true,
    stationType: normalizeStationType(dto.stationType),
  };
}

export async function getStationGuards(
  stationId: number
): Promise<AssignedUser[]> {
  const res = await fetch(`${API_BASE_URL}/api/stations/${stationId}/guards`);
  if (!res.ok) throw new Error("Failed to fetch station guards");

  const dtos = await res.json();
  return dtos.map((dto: any) => ({
    id: dto.accountID,
    username: dto.username,
    accountType: dto.accountType,
  }));
}

export async function updateStationGuards(
  stationId: number,
  guardIds: number[]
): Promise<AssignedUser[]> {
  const res = await fetch(`${API_BASE_URL}/api/stations/${stationId}/guards`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guardIds }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to update station guards");
  }

  const dtos = await res.json();
  return dtos.map((dto: any) => ({
    id: dto.id ?? dto.accountID,
    username: dto.username,
    accountType: dto.accountType,
  }));
}
