// src/pages/ArchiveCenter/ArchiveCenter.tsx
import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import Meta from "../../utils/Meta";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import PaginationControls from "../../components/common/PaginationControls";
import { Table, Thead, Tbody, Tr, Th, Td } from "../../components/common/Table";

import {
  getArchivedVisitors,
  getArchivedLogs,
  getArchivedEntries,
  getVisitorsCsvExportUrl,
  getLogsCsvExportUrl,
  getEntriesCsvExportUrl,
  getArchivePdfReportUrl,
} from "../../api/ArchiveApi";

import type { Visitor } from "../../api/VisitorsApi";
import type {
  VisitorLogDTO,
  VisitorLogEntryDTO,
} from "../../api/VisitorLogsApi";

import {
  VISITOR_TYPE_FILTER_VALUES,
  normalizeVisitorType,
} from "../../constants/visitorTypes";

import {
  getAllStations,
  type Station,
} from "../../api/Index";

import { sortGateAware } from "../../utils/locationSort";

type ViewMode = "EXPORTS" | "VISITORS" | "LOGS" | "ENTRIES";

/**
 * Normalizes a date-ish string to yyyy-MM-dd (or null).
 * Works with ISO-like strings too.
 */
function toDateKey(isoLike?: string | null): string | null {
  if (!isoLike) return null;
  return isoLike.slice(0, 10);
}

/**
 * Inclusive range check on yyyy-MM-dd strings.
 * If from/to are undefined, they are ignored.
 */
function isWithinRange(
  dateKey: string | null,
  from?: string,
  to?: string
): boolean {
  if (!dateKey) return true;
  if (from && dateKey < from) return false;
  if (to && dateKey > to) return false;
  return true;
}

const todayKey = new Date().toISOString().slice(0, 10);

export default function ArchiveCenter() {
  Meta({ title: "Archive Center - iVisit" });

  const [viewMode, setViewMode] = useState<ViewMode>("EXPORTS");

  const [archivedVisitors, setArchivedVisitors] = useState<Visitor[]>([]);
  const [archivedLogs, setArchivedLogs] = useState<VisitorLogDTO[]>([]);
  const [archivedEntries, setArchivedEntries] = useState<VisitorLogEntryDTO[]>(
    []
  );
  const [stations, setStations] = useState<Station[]>([]);

  const [search, setSearch] = useState("");

  const [visitorTypeFilter, setVisitorTypeFilter] = useState<string>("all");
  const [entryStationFilter, setEntryStationFilter] = useState<string>("all");
  const [entryGuardFilter, setEntryGuardFilter] = useState<string>("all");

  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Shared client-side pagination
  const [page, setPage] = useState(0);      // 0-based
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [visitorsData, logsData, entriesData, stationsData] =
          await Promise.all([
            getArchivedVisitors(),
            getArchivedLogs(),
            getArchivedEntries(),
            getAllStations(),
          ]);

        setArchivedVisitors(visitorsData);
        setArchivedLogs(logsData);
        setArchivedEntries(entriesData);
        setStations(stationsData);
        setError(null);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load archives.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const earliestArchiveDate = useMemo(() => {
    const dates: string[] = [];

    archivedVisitors.forEach((v) => {
      const key =
        toDateKey(v.archivedAt ?? null) ?? toDateKey(v.createdAt ?? null);
      if (key) dates.push(key);
    });

    archivedLogs.forEach((l) => {
      const key =
        toDateKey(l.archivedAt ?? null) ?? toDateKey(l.date ?? null);
      if (key) dates.push(key);
    });

    archivedEntries.forEach((e) => {
      const key =
        toDateKey(e.archivedAt ?? null) ?? toDateKey(e.timestamp ?? null);
      if (key) dates.push(key);
    });

    if (dates.length === 0) return null;

    return dates.reduce((min, d) => (d < min ? d : min), dates[0]);
  }, [archivedVisitors, archivedLogs, archivedEntries]);

  const visitorTypeOptions = VISITOR_TYPE_FILTER_VALUES;

  const entryStationOptions = useMemo(() => {
    if (!stations.length) return [];
    const names = stations
      .map((s) => (s.name || "").trim())
      .filter((n) => n && n !== "N/A");
    const unique = Array.from(new Set(names));
    return sortGateAware(unique);
  }, [stations]);

  const entryGuardOptions = useMemo(() => {
    const set = new Set<string>();
    archivedEntries.forEach((e) => {
      const g = (e.guardName ?? "").trim();
      if (g) set.add(g);
    });
    return Array.from(set).sort();
  }, [archivedEntries]);

  const handleFromDateChange = (raw: string) => {
    if (!raw) {
      setFromDate("");
      setPage(0);
      return;
    }

    let val = raw;

    if (earliestArchiveDate && val < earliestArchiveDate) {
      val = earliestArchiveDate;
    }

    if (val > todayKey) {
      val = todayKey;
    }

    if (toDate && val > toDate) {
      setToDate(val);
    }

    setFromDate(val);
    setPage(0);
  };

  const handleToDateChange = (raw: string) => {
    if (!raw) {
      setToDate("");
      setPage(0);
      return;
    }

    let val = raw;

    if (earliestArchiveDate && val < earliestArchiveDate) {
      val = earliestArchiveDate;
    }

    if (val > todayKey) {
      val = todayKey;
    }

    if (fromDate && val < fromDate) {
      setFromDate(val);
    }

    setToDate(val);
    setPage(0);
  };

  const filteredVisitors = useMemo(() => {
    const term = search.trim().toLowerCase();
    const from = fromDate || undefined;
    const to = toDate || undefined;

    return archivedVisitors.filter((v) => {
      const dateKey =
        toDateKey(v.archivedAt ?? null) ?? toDateKey(v.createdAt ?? null);
      if (!isWithinRange(dateKey, from, to)) return false;

      const normalizedType = normalizeVisitorType(v.visitorType);
      if (visitorTypeFilter !== "all") {
        if (!normalizedType || normalizedType !== visitorTypeFilter) return false;
      }

      if (!term) return true;

      const fields = [
        v.visitorName ?? "",
        v.idNumber ?? "",
        v.idType ?? "",
        normalizedType,
        v.gender ?? "",
      ];

      return fields.some((f) => f.toLowerCase().includes(term));
    });
  }, [archivedVisitors, search, visitorTypeFilter, fromDate, toDate]);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    const from = fromDate || undefined;
    const to = toDate || undefined;

    return archivedLogs.filter((l) => {
      const dateKey =
        toDateKey(l.archivedAt ?? null) ?? toDateKey(l.date ?? null);
      if (!isWithinRange(dateKey, from, to)) return false;

      if (!term) return true;

      const fields = [
        l.fullName ?? "",
        l.purposeOfVisit ?? "",
        l.firstLocation ?? "",
        l.location ?? "",
        l.loggedBy ?? "",
        l.passNo ?? "",
      ];

      return fields.some((f) => f.toLowerCase().includes(term));
    });
  }, [archivedLogs, search, fromDate, toDate]);

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase();
    const from = fromDate || undefined;
    const to = toDate || undefined;

    return archivedEntries.filter((e) => {
      const dateKey =
        toDateKey(e.archivedAt ?? null) ?? toDateKey(e.timestamp ?? null);
      if (!isWithinRange(dateKey, from, to)) return false;

      if (entryStationFilter !== "all") {
        const station = (e.stationName ?? "").trim().toLowerCase();
        if (!station || station !== entryStationFilter.trim().toLowerCase()) {
          return false;
        }
      }

      if (entryGuardFilter !== "all") {
        const guard = (e.guardName ?? "").trim().toLowerCase();
        if (!guard || guard !== entryGuardFilter.trim().toLowerCase()) {
          return false;
        }
      }

      if (!term) return true;

      const fields = [
        e.visitorName ?? "",
        e.stationName ?? "",
        e.guardName ?? "",
        e.passNo ?? "",
      ];

      return fields.some((f) => f.toLowerCase().includes(term));
    });
  }, [
    archivedEntries,
    search,
    entryStationFilter,
    entryGuardFilter,
    fromDate,
    toDate,
  ]);

  // PAGINATION PER VIEW (all use shared page/pageSize)

  // Visitors
  const totalVisitorElements = filteredVisitors.length;
  const totalVisitorPages =
    totalVisitorElements === 0
      ? 0
      : Math.ceil(totalVisitorElements / pageSize);

  const currentVisitorPage =
    totalVisitorPages === 0 ? 0 : Math.min(page, totalVisitorPages - 1);

  const pagedVisitors = filteredVisitors.slice(
    currentVisitorPage * pageSize,
    currentVisitorPage * pageSize + pageSize
  );

  // Logs
  const totalLogElements = filteredLogs.length;
  const totalLogPages =
    totalLogElements === 0 ? 0 : Math.ceil(totalLogElements / pageSize);

  const currentLogPage =
    totalLogPages === 0 ? 0 : Math.min(page, totalLogPages - 1);

  const pagedLogs = filteredLogs.slice(
    currentLogPage * pageSize,
    currentLogPage * pageSize + pageSize
  );

  // Entries
  const totalEntryElements = filteredEntries.length;
  const totalEntryPages =
    totalEntryElements === 0 ? 0 : Math.ceil(totalEntryElements / pageSize);

  const currentEntryPage =
    totalEntryPages === 0 ? 0 : Math.min(page, totalEntryPages - 1);

  const pagedEntries = filteredEntries.slice(
    currentEntryPage * pageSize,
    currentEntryPage * pageSize + pageSize
  );

  const visitorsCsvUrl = useMemo(
    () => getVisitorsCsvExportUrl(fromDate || undefined, toDate || undefined),
    [fromDate, toDate]
  );
  const logsCsvUrl = useMemo(
    () => getLogsCsvExportUrl(fromDate || undefined, toDate || undefined),
    [fromDate, toDate]
  );
  const entriesCsvUrl = useMemo(
    () => getEntriesCsvExportUrl(fromDate || undefined, toDate || undefined),
    [fromDate, toDate]
  );
  const pdfReportUrl = useMemo(
    () => getArchivePdfReportUrl(fromDate || undefined, toDate || undefined),
    [fromDate, toDate]
  );

  if (loading) {
    return (
      <DashboardLayout>
        <p className="text-gray-400 text-center mt-8">Loading archives...</p>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <p className="text-red-400 text-center mt-8">{error}</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xl">Archive Center</p>
          <p className="text-xs text-slate-400">
            View and export archived visitors, visitor logs, and movement
            entries for audits and reports.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <div className="inline-flex bg-slate-800 rounded-md overflow-hidden">
            {[
              { key: "EXPORTS", label: "Exports" },
              { key: "VISITORS", label: "Visitors" },
              { key: "LOGS", label: "Logs" },
              { key: "ENTRIES", label: "Entries" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setViewMode(tab.key as ViewMode);
                  setPage(0);
                }}
                className={`px-3 py-1 text-xs border-r border-slate-700 last:border-r-0 ${viewMode === tab.key
                  ? "bg-primary text-white"
                  : "text-slate-300 hover:bg-slate-700"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {viewMode !== "EXPORTS" && (
            <Input
              className="text-dark-gray w-full md:w-56"
              placeholder={
                viewMode === "VISITORS"
                  ? "Filter by name, ID, type..."
                  : viewMode === "LOGS"
                    ? "Filter by name, purpose, location..."
                    : "Filter by name, station, guard..."
              }
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          )}
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-slate-300">Archive date range:</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-slate-400">From</span>
              <input
                type="date"
                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs"
                value={fromDate}
                min={earliestArchiveDate ?? undefined}
                max={todayKey}
                onChange={(e) => handleFromDateChange(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">To</span>
              <input
                type="date"
                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs"
                value={toDate}
                min={earliestArchiveDate ?? undefined}
                max={todayKey}
                onChange={(e) => handleToDateChange(e.target.value)}
              />
            </div>
          </div>
          <span className="text-slate-500">
            Leave blank to include all archived records.
          </span>
        </div>

        {viewMode === "VISITORS" && (
          <div className="flex flex-wrap gap-3 text-xs items-center">
            <span className="text-slate-300">Filters:</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Visitor type</span>
              <select
                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs"
                value={visitorTypeFilter}
                onChange={(e) => {
                  setVisitorTypeFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">All</option>
                {visitorTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {viewMode === "ENTRIES" && (
          <div className="flex flex-wrap gap-3 text-xs items-center">
            <span className="text-slate-300">Filters:</span>

            <div className="flex items-center gap-1">
              <span className="text-slate-400">Station</span>
              <select
                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs"
                value={entryStationFilter}
                onChange={(e) => {
                  setEntryStationFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">All</option>
                {entryStationOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-slate-400">Guard</span>
              <select
                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs"
                value={entryGuardFilter}
                onChange={(e) => {
                  setEntryGuardFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">All</option>
                {entryGuardOptions.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {viewMode === "EXPORTS" && (
        <div className="space-y-4">
          <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/40">
            <p className="text-sm font-semibold mb-2">CSV Exports</p>
            <p className="text-xs text-slate-400 mb-3">
              Generate CSV files directly from archived data for the selected
              date range.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href={visitorsCsvUrl} target="_blank" rel="noreferrer">
                <Button variation="secondary" className="text-xs px-3 py-1.5">
                  Download Visitors CSV
                </Button>
              </a>
              <a href={logsCsvUrl} target="_blank" rel="noreferrer">
                <Button variation="secondary" className="text-xs px-3 py-1.5">
                  Download Logs CSV
                </Button>
              </a>
              <a href={entriesCsvUrl} target="_blank" rel="noreferrer">
                <Button variation="secondary" className="text-xs px-3 py-1.5">
                  Download Entries CSV
                </Button>
              </a>
            </div>
          </div>

          <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/40">
            <p className="text-sm font-semibold mb-2">PDF Report</p>
            <p className="text-xs text-slate-400 mb-3">
              Generate a combined PDF report summarizing archived visitors,
              logs, and entries for the selected range.
            </p>
            <a href={pdfReportUrl} target="_blank" rel="noreferrer">
              <Button className="text-xs px-3 py-1.5">Download PDF Report</Button>
            </a>
          </div>
        </div>
      )}

      {viewMode === "VISITORS" && (
        <div>
          <Table>
            <Thead>
              <Tr>
                <Th>Visitor ID</Th>
                <Th>Name</Th>
                <Th>Visitor Type</Th>
                <Th>Gender</Th>
                <Th>ID Type</Th>
                <Th>ID Number</Th>
                <Th>Date of Birth</Th>
                <Th>Registered At</Th>
                <Th>Archived At</Th>
              </Tr>
            </Thead>
            <Tbody>
              {pagedVisitors.map((v) => {
                const normalizedType = normalizeVisitorType(v.visitorType);
                return (
                  <Tr key={v.visitorID}>
                    <Td>{v.visitorID}</Td>
                    <Td>{v.visitorName}</Td>
                    <Td>{normalizedType || v.visitorType || "N/A"}</Td>
                    <Td>{v.gender ?? "—"}</Td>
                    <Td>{v.idType}</Td>
                    <Td>{v.idNumber}</Td>
                    <Td>{v.dateOfBirth ?? "—"}</Td>
                    <Td>{v.createdAt ?? "—"}</Td>
                    <Td>{v.archivedAt ?? "—"}</Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
          <PaginationControls
            page={currentVisitorPage}
            pageSize={pageSize}
            totalElements={totalVisitorElements}
            totalPages={totalVisitorPages}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(0);
            }}
          />
        </div>
      )}

      {viewMode === "LOGS" && (
        <div>
          <Table>
            <Thead>
              <Tr>
                <Th>Log ID</Th>
                <Th>Full Name</Th>
                <Th>ID Type</Th>
                <Th>Pass No</Th>
                <Th>First Location</Th>
                <Th>Last Location</Th>
                <Th>Purpose</Th>
                <Th>Logged By</Th>
                <Th>Date</Th>
                <Th>Time</Th>
                <Th>Archived At</Th>
              </Tr>
            </Thead>
            <Tbody>
              {pagedLogs.map((log) => (
                <Tr key={log.visitorLogID}>
                  <Td>{log.visitorLogID}</Td>
                  <Td>{log.fullName}</Td>
                  <Td>{log.idType}</Td>
                  <Td>{log.passNo}</Td>
                  <Td>{log.firstLocation ?? "—"}</Td>
                  <Td>{log.location}</Td>
                  <Td>{log.purposeOfVisit}</Td>
                  <Td>{log.loggedBy}</Td>
                  <Td>{log.date}</Td>
                  <Td>{log.time}</Td>
                  <Td>{log.archivedAt ?? "—"}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <PaginationControls
            page={currentLogPage}
            pageSize={pageSize}
            totalElements={totalLogElements}
            totalPages={totalLogPages}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(0);
            }}
          />
        </div>
      )}

      {viewMode === "ENTRIES" && (
        <div>
          <Table>
            <Thead>
              <Tr>
                <Th>Entry ID</Th>
                <Th>Log ID</Th>
                <Th>Visitor Name</Th>
                <Th>Visitor Type</Th>
                <Th>Station</Th>
                <Th>Guard</Th>
                <Th>Pass No</Th>
                <Th>Timestamp</Th>
                <Th>Archived At</Th>
              </Tr>
            </Thead>
            <Tbody>
              {pagedEntries.map((e) => (
                <Tr key={e.entryId}>
                  <Td>{e.entryId}</Td>
                  <Td>{e.visitorLogId}</Td>
                  <Td>{e.visitorName}</Td>
                  <Td>{e.visitorType ?? "N/A"}</Td>
                  <Td>{e.stationName}</Td>
                  <Td>{e.guardName}</Td>
                  <Td>{e.passNo ?? "—"}</Td>
                  <Td>{e.timestamp}</Td>
                  <Td>{e.archivedAt ?? "—"}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <PaginationControls
            page={currentEntryPage}
            pageSize={pageSize}
            totalElements={totalEntryElements}
            totalPages={totalEntryPages}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(0);
            }}
          />
        </div>
      )}
    </DashboardLayout>
  );
}
