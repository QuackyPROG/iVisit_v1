// src/pages/ActivityLogs.tsx
import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Input from "../../components/common/Input";
import Meta from "../../utils/Meta";
import {
  getAllLogEntries,
  type VisitorLogEntryDTO,
} from "../../api/VisitorLogsApi";
import { formatActivityMessage } from "../../utils/activityFormatter";
import PaginationControls from "../../components/common/PaginationControls";

dayjs.extend(relativeTime);

interface ActivityLog {
  entryId: number;
  message: string;
  createdAt: string;
}

export default function ActivityLogs() {
  Meta({ title: "Activity Logs - iVisit" });

  const [data, setData] = useState<ActivityLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Client-side pagination
  const [page, setPage] = useState(0);       // 0-based
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true);
        const entries: VisitorLogEntryDTO[] = await getAllLogEntries();

        const mapped: ActivityLog[] = entries.map((e) => ({
          entryId: e.entryId,
          message: formatActivityMessage(e),
          createdAt: e.timestamp,
        }));

        setData(mapped);
        setError(null);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Failed to load activity logs.");
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, []);

  // 1) Filter by search
  const filtered = data.filter((activity) =>
    activity.message.toLowerCase().includes(search.toLowerCase())
  );

  // 2) Pagination metrics
  const totalElements = filtered.length;
  const totalPages =
    totalElements === 0 ? 0 : Math.ceil(totalElements / pageSize);

  // Clamp
  const currentPage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);

  // 3) Slice
  const paged = filtered.slice(
    currentPage * pageSize,
    currentPage * pageSize + pageSize
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
        <p className="text-xl">Activity Logs</p>
        <div className="flex items-center gap-2">
          <Input
            className="text-dark-gray w-full"
            placeholder="Search..."
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
      </div>

      {loading && (
        <p className="text-gray-400 text-center mt-4">
          Loading activity logs...
        </p>
      )}

      {error && !loading && (
        <p className="text-red-400 text-center mt-4">{error}</p>
      )}

      {!loading && !error && (
        <>
          <div className="overflow-y-scroll space-y-2 custom-scrollbar">
            {filtered.length === 0 ? (
              <p className="text-gray-400 text-center mt-4">
                No activity logs found.
              </p>
            ) : (
              paged.map((activity) => (
                <div
                  key={activity.entryId}
                  title={activity.message}
                  className="rounded-lg border border-white/30 p-3 text-sm bg-white/5"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  <p className="line-clamp-2">{activity.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {activity.createdAt
                      ? dayjs(activity.createdAt).fromNow()
                      : "Unknown time"}
                  </p>
                </div>
              ))
            )}
          </div>

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
        </>
      )}
    </DashboardLayout>
  );
}
