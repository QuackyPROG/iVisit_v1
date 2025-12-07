// src/pages/DeviceSettings/DeviceSettings.tsx
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import Button from "../../components/common/Button";
import Select from "../../components/common/Select";
import Meta from "../../utils/Meta";
import { useToast } from "../../contexts/ToastContext";

import { getStationInfo, setStationInfo } from "../../api/HelperApi";
import { getAllStations, type Station } from "../../api/StationsApi";

export default function DeviceSettings() {
  Meta({ title: "Device Settings - iVisit" });
  
  const { showToast } = useToast();

  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  const [helperReachable, setHelperReachable] = useState<boolean | null>(null);
  const [currentHelperStationId, setCurrentHelperStationId] = useState<number | null>(null);

  const [selectedStationId, setSelectedStationId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  const helperBaseUrl =
    (import.meta as any).env?.VITE_HELPER_BASE_URL ?? "(not configured)";

  // resolve station name for messages
  const currentStation = useMemo(
    () => stations.find((s) => s.id === currentHelperStationId) ?? null,
    [stations, currentHelperStationId]
  );

  const selectedStation = useMemo(
    () =>
      typeof selectedStationId === "number"
        ? stations.find((s) => s.id === selectedStationId) ?? null
        : null,
    [stations, selectedStationId]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        const [stationsData, helperInfo] = await Promise.all([
          getAllStations(),
          getStationInfo(),
        ]);

        if (cancelled) return;

        setStations(stationsData);

        if (helperInfo) {
          setHelperReachable(true);
          setCurrentHelperStationId(helperInfo.stationId);
          setSelectedStationId(helperInfo.stationId);
        } else {
          setHelperReachable(false);
          setCurrentHelperStationId(null);
          setSelectedStationId("");
        }
      } catch (err) {
        console.error("Failed to load device settings:", err);
        if (!cancelled) {
          setHelperReachable(false);
          showToast(
            "Failed to reach helper app or load stations. Check your connection.",
            { variant: "error" }
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const handleSave = async () => {
    if (!helperReachable) {
      showToast("Helper app is not reachable on this device.", {
        variant: "warning",
      });
      return;
    }

    if (selectedStationId === "") {
      showToast("Please select a station first.", { variant: "warning" });
      return;
    }

    try {
      setSaving(true);
      await setStationInfo(selectedStationId as number);

      setCurrentHelperStationId(selectedStationId as number);

      showToast(
        selectedStation
          ? `This device is now bound to station: ${selectedStation.name} (ID ${selectedStation.id}).`
          : "Station binding updated for this device.",
        { variant: "success" }
      );
    } catch (err: any) {
      console.error("Failed to update station binding:", err);
      showToast(
        err?.message || "Failed to update station binding on helper app.",
        { variant: "error" }
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-xl space-y-6">
        {/* Heading */}
        <div>
          <h1 className="text-2xl font-semibold mb-1">Device / Helper Settings</h1>
          <p className="text-sm text-gray-300">
            Configure which station this computer (and its RFID / OCR helper app)
            belongs to. This page should be opened on the device running the
            iVisit Helper.
          </p>
        </div>

        {/* Helper status card */}
        <div className="bg-white/5 border border-white/20 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-medium">Helper App Status</p>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                helperReachable
                  ? "bg-green-500/20 text-green-200"
                  : helperReachable === false
                  ? "bg-red-500/20 text-red-200"
                  : "bg-gray-500/20 text-gray-200"
              }`}
            >
              {helperReachable
                ? "ONLINE"
                : helperReachable === false
                ? "OFFLINE"
                : "CHECKING..."}
            </span>
          </div>

          <div className="text-xs text-gray-300 space-y-1">
            <p>
              Helper base URL: <code className="text-gray-100">{helperBaseUrl}</code>
            </p>
            {currentStation ? (
              <p>
                Current helper station:{" "}
                <span className="font-medium">
                  {currentStation.name} (ID {currentStation.id})
                </span>
              </p>
            ) : currentHelperStationId != null ? (
              <p>
                Current helper station ID:{" "}
                <span className="font-medium">{currentHelperStationId}</span> (not
                found in station list)
              </p>
            ) : (
              <p>No station is currently bound to this device.</p>
            )}

            {!helperReachable && !loading && (
              <p className="text-red-300">
                The frontend could not reach the helper app on this device. Make sure
                iVisit Helper is running and that the base URL is correct.
              </p>
            )}
          </div>
        </div>

        {/* Binding form */}
        <div className="bg-white/5 border border-white/20 rounded-lg p-4 space-y-4">
          <p className="font-medium">Bind this device to a station</p>

          {loading ? (
            <p className="text-gray-300 text-sm">Loading stations…</p>
          ) : stations.length === 0 ? (
            <p className="text-gray-300 text-sm">
              No stations available. Create stations first in the Stations page.
            </p>
          ) : (
            <>
              <label className="text-sm text-gray-200 flex flex-col gap-1">
                <span>Station</span>
                <Select
  id="stationSelect"
  placeholder="Select a station…"
  disabled={!helperReachable || saving}
  value={selectedStationId === "" ? "" : String(selectedStationId)}
  onChange={(v) => {
    if (!v) setSelectedStationId("");
    else setSelectedStationId(Number(v));
  }}
  options={stations.map((s) => ({
    value: String(s.id),
    label: `${s.name} (ID ${s.id})`,
  }))}
/>
              </label>

              <div className="flex justify-end">
                <Button
                  variation="primary"
                  onClick={handleSave}
                  disabled={!helperReachable || saving || stations.length === 0}
                >
                  {saving ? "Saving..." : "Save binding"}
                </Button>
              </div>

              <p className="text-xs text-gray-400">
                This setting is stored locally by the helper app on this machine, so
                you need to repeat this process on each guard PC.
              </p>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
