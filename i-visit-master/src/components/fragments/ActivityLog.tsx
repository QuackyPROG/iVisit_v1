// src/components/fragments/ActivityLog.tsx
import { useEffect, useState } from "react";
import Button from "../../components/common/Button";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  getAllLogEntries,
  type VisitorLogEntryDTO,
} from "../../api/VisitorLogsApi";
import { formatActivityMessage } from "../../utils/activityFormatter";

dayjs.extend(relativeTime);

interface ActivityLogItem {
  entryId: number;
  message: string;
  createdAt: string;
}

export default function ActivityLog() {
  const [data, setData] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true);
        const entries: VisitorLogEntryDTO[] = await getAllLogEntries();

        const mapped: ActivityLogItem[] = entries.map((e) => ({
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

  const topFive = data.slice(0, 5);

  return (
    <>
      <div>
        <p className="text-xl text-white my-2">Activity Log</p>
      </div>
      <div className="text-white flex-1 overflow-y-auto space-y-2">
        {loading && (
          <p className="text-gray-400 text-center mt-2">
            Loading recent activity...
          </p>
        )}

        {error && !loading && (
          <p className="text-red-400 text-center mt-2 text-sm">{error}</p>
        )}

        {!loading && !error && topFive.length === 0 && (
          <p className="text-gray-400 text-center mt-2 text-sm">
            No recent activity.
          </p>
        )}

        {!loading &&
          !error &&
          topFive.map((activity) => (
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
          ))}
      </div>

      <div className="flex justify-center mt-3">
        <Button
          onClick={() => (location.href = "/dashboard/activity-logs")}
          variation="outlined"
          className="w-full"
        >
          See all
        </Button>
      </div>
    </>
  );
}
