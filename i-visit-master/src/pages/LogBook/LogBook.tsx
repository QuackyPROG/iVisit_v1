// src/pages/LogBook/LogBook.tsx
import { useEffect, useState, useMemo } from "react";
import Button from "../../components/common/Button";
import DashboardLayout from "../../layouts/DashboardLayout";
import Meta from "../../utils/Meta";
import { Table, Thead, Tbody, Tr, Th, Td } from "../../components/common/Table";
import Input from "../../components/common/Input";
import Modal from "../../components/common/Modal";
import PaginationControls from "../../components/common/PaginationControls";

import {
  getAllLogs, getActiveLogs, type VisitorLogDTO,
  getAllStations, type Station,
} from "../../api/Index";

import { sortGateAware } from "../../utils/locationSort";

interface LogStats {
  active: number;
  uniqueToday: number;
  frequentBuilding: string;
  highestGate: string;
  uniqueWeek: number;
  uniqueMonth: number;
}

export default function LogBook() {
  Meta({ title: "Log Book - iVisit" });

  const [data, setData] = useState<VisitorLogDTO[]>([]);
  const [activeLogIds, setActiveLogIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] =
    useState<"all" | "active" | "inactive">("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [stations, setStations] = useState<Station[]>([]);

  // Client-side pagination
  const [page, setPage] = useState(0);      // 0-based
  const [pageSize, setPageSize] = useState(25);

  // FETCH DATA
  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true);
        const [allLogs, activeLogs, stationsData] = await Promise.all([
          getAllLogs(),
          getActiveLogs(),
          getAllStations(),
        ]);

        setData(allLogs);
        setActiveLogIds(activeLogs.map((l) => l.visitorLogID));
        setStations(stationsData);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Failed to load visitor logs.");
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  // Helper: status of a log
  const isActive = (logId: number) => activeLogIds.includes(logId);

  // unique locations for filter
  const locationOptions = useMemo(() => {
    if (!stations.length) return [];

    const names = stations
      .map((s) => (s.name || "").trim())
      .filter((n) => n && n !== "N/A");

    const unique = Array.from(new Set(names));

    return sortGateAware(unique);
  }, [stations]);

  // FILTERED DATA
  const filteredLogs = useMemo(() => {
    const term = search.toLowerCase();

    return data.filter((e) => {
      const logIsActive = isActive(e.visitorLogID);
      const location = (e.location || "").trim().toLowerCase();

      // 1) Status filter
      if (statusFilter === "active" && !logIsActive) return false;
      if (statusFilter === "inactive" && logIsActive) return false;

      // 2) Location filter
      if (locationFilter !== "all") {
        if (!location || location !== locationFilter.trim().toLowerCase()) return false;
      }

      // 3) Text search
      if (!term) return true;

      const fields = [
        e.fullName ?? "",
        e.idType ?? "",
        e.passNo ?? "",
        e.location ?? "",
        e.purposeOfVisit ?? "",
        e.loggedBy ?? "",
        e.date ?? "",
        e.time ?? "",
      ];

      return fields.some((field) => field.toLowerCase().includes(term));
    });
  }, [data, search, statusFilter, locationFilter, activeLogIds]);

  // PAGINATION DERIVED FROM FILTERED LOGS
  const totalElements = filteredLogs.length;
  const totalPages =
    totalElements === 0 ? 0 : Math.ceil(totalElements / pageSize);

  const currentPage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);

  const pagedLogs = filteredLogs.slice(
    currentPage * pageSize,
    currentPage * pageSize + pageSize
  );

  // STATS
  const stats = useMemo<LogStats | null>(() => {
    if (data.length === 0) return null;

    const today = new Date().toISOString().slice(0, 10);

    const todayLogs = data.filter((d) => d.date === today);
    const todayActiveLogs = todayLogs.filter((d) =>
      activeLogIds.includes(d.visitorLogID)
    );

    const uniqueToday = new Set(todayLogs.map((d) => d.fullName)).size;
    const active = todayActiveLogs.length;

    const locationCount: Record<string, number> = {};
    todayLogs.forEach((d) => {
      const loc = d.location || "Unknown";
      locationCount[loc] = (locationCount[loc] || 0) + 1;
    });
    const frequentBuilding = Object.entries(locationCount).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    const gateCount: Record<string, number> = {};
    todayLogs.forEach((d) => {
      const loc = (d.location || "").toLowerCase();
      if (loc.includes("gate")) {
        const key = d.location || "Unknown gate";
        gateCount[key] = (gateCount[key] || 0) + 1;
      }
    });
    const highestGate = Object.entries(gateCount).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    // "week" and "month" are based on all distinct names in data
    const uniqueWeek = new Set(data.map((d) => d.fullName)).size;
    const uniqueMonth = new Set(data.map((d) => d.fullName)).size;

    return {
      active,
      uniqueToday,
      frequentBuilding: frequentBuilding || "N/A",
      highestGate: highestGate || "N/A",
      uniqueWeek,
      uniqueMonth,
    };
  }, [data, activeLogIds]);

  // UI STATES
  if (loading) {
    return (
      <DashboardLayout>
        <p className="text-gray-400 text-center mt-8">Loading logs...</p>
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
        <p className="text-xl">Log Book</p>

        <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 text-xs md:text-sm">
            {/* Status filter */}
            <div className="flex items-center gap-1">
              <span className="text-slate-300">Status:</span>
              <select
                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as "all" | "active" | "inactive");
                  setPage(0);
                }}
              >
                <option value="all">All</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </div>

            {/* Location filter */}
            <div className="flex items-center gap-1">
              <span className="text-slate-300">Location:</span>
              <select
                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs"
                value={locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">All</option>
                {locationOptions.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search + Stats */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Input
              className="text-dark-gray w-full"
              placeholder="Search name, pass, purpose..."
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
            <Button
              className="min-w-[110px]"
              onClick={() => setIsModalOpen(true)}
            >
              Statistics
            </Button>
          </div>
        </div>
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th>Full Name</Th>
            <Th>ID Type</Th>
            <Th>Pass No</Th>
            <Th>Location</Th>
            <Th>Purpose</Th>
            <Th>Logged By</Th>
            <Th>Date</Th>
            <Th>Time</Th>
            <Th>Status</Th>
          </Tr>
        </Thead>
        <Tbody>
          {pagedLogs.map((row, i) => {
            const status = isActive(row.visitorLogID) ? "Active" : "Inactive";
            return (
              <Tr key={i}>
                <Td>{row.fullName}</Td>
                <Td>{row.idType}</Td>
                <Td>{row.passNo}</Td>
                <Td>{row.location}</Td>
                <Td>{row.purposeOfVisit}</Td>
                <Td>{row.loggedBy}</Td>
                <Td>{row.date}</Td>
                <Td>{row.time}</Td>
                <Td>
                  <span
                    className={
                      status === "Active" ? "text-green-400" : "text-red-400"
                    }
                  >
                    {status}
                  </span>
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>

      <PaginationControls
        page={currentPage}
        pageSize={pageSize}
        totalElements={totalElements}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(0);
        }}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Statistics"
      >
        {data.length > 0 && stats ? (
          <div className="space-y-4">
            <div>
              <p className="font-semibold">On this day...</p>
              <ul className="list-disc list-inside text-sm text-gray-300">
                <li>{stats.active} Active Visitor(s)</li>
                <li>{stats.uniqueToday} Unique Visitor(s)</li>
                <li>{stats.frequentBuilding} is the frequent Building</li>
                <li>{stats.highestGate} has the highest influx</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold">Other Data...</p>
              <ul className="list-disc list-inside text-sm text-gray-300">
                <li>{stats.uniqueWeek} Unique Visitor(s) this Week</li>
                <li>{stats.uniqueMonth} Unique Visitor(s) this Month</li>
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-center">No statistics available.</p>
        )}
      </Modal>
    </DashboardLayout>
  );
}
