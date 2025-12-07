// src/api/ArchiveApi.tsx
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

import type { Visitor } from "./VisitorsApi";
import type { VisitorLogDTO, VisitorLogEntryDTO } from "./VisitorLogsApi";

// --- Helpers for building URLs with optional date range ---

function buildUrl(path: string, from?: string, to?: string): string {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  const params = url.searchParams;

  if (from) params.set("from", from); // yyyy-MM-dd
  if (to) params.set("to", to);       // yyyy-MM-dd

  return url.toString();
}

// ---- Export URL builders ----
// These are meant to be used in <a href="..."> or window.open(...)

export function getVisitorsCsvExportUrl(from?: string, to?: string): string {
  return buildUrl("/api/archive/visitors/export", from, to);
}

export function getLogsCsvExportUrl(from?: string, to?: string): string {
  return buildUrl("/api/archive/logs/export", from, to);
}

export function getEntriesCsvExportUrl(from?: string, to?: string): string {
  return buildUrl("/api/archive/entries/export", from, to);
}

export function getArchivePdfReportUrl(from?: string, to?: string): string {
  return buildUrl("/api/archive/report", from, to);
}

// ---- Archived records APIs (unchanged for now) ----

export async function getArchivedVisitors(): Promise<Visitor[]> {
  const res = await fetch(`${API_BASE_URL}/api/visitors/archived`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load archived visitors");
  return res.json();
}

export async function getArchivedLogs(): Promise<VisitorLogDTO[]> {
  const res = await fetch(`${API_BASE_URL}/api/visitorLog/archived`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load archived logs");
  return res.json();
}

export async function getArchivedEntries(): Promise<VisitorLogEntryDTO[]> {
  const res = await fetch(`${API_BASE_URL}/api/visitorLog/entries/archived`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load archived entries");
  return res.json();
}
