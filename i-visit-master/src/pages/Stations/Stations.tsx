// src/pages/.../Stations.tsx
import { useEffect, useState } from "react";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Input from "../../components/common/Input";
import CheckboxTile from "../../components/common/CheckboxTile";
import DashboardLayout from "../../layouts/DashboardLayout";
import Meta from "../../utils/Meta";
import {
  getAllStations, getStationGuards, updateStationGuards,
  updateStation, type Station, type AssignedUser as StationAssignedUser,
  getAllUsers, type UserAccount, createStation, setStationActive,
} from "../../api/Index";

type StationWithUsers = Station & {
  assignedUsers?: StationAssignedUser[];
  active?: boolean | null;
};

export default function Stations() {
  Meta({ title: "Stations - iVisit" });

  const [currentType, setCurrentType] = useState<"gate" | "building">("gate");
  const [stations, setStations] = useState<StationWithUsers[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // guards-related state
  const [assignedUsers, setAssignedUsers] = useState<StationAssignedUser[]>([]);
  const [allGuards, setAllGuards] = useState<StationAssignedUser[]>([]);
  const [guardsLoading, setGuardsLoading] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedGuardIds, setSelectedGuardIds] = useState<number[]>([]);

  // add/deactivate station state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<"gate" | "building">("gate");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // edit station state
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [renameType, setRenameType] = useState<"gate" | "building">("gate");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameSubmitting, setRenameSubmitting] = useState(false);

  const selectedStation: StationWithUsers | null = selectedStationId
    ? stations.find((s) => s.id === selectedStationId) || null
    : null;

  // Load stations + all guards on mount
  useEffect(() => {
    let cancelled = false;

    const fetchStationsAndGuards = async () => {
      try {
        setLoading(true);
        const [stationsData, usersData] = await Promise.all([
          getAllStations(),
          getAllUsers(),
        ]);

        if (!cancelled) {
          const normalizedStations: StationWithUsers[] = stationsData.map(
            (s) => ({
              ...s,
              active: s.active ?? true,
              stationType: s.stationType ?? null,
            })
          );

          setStations(normalizedStations);

          const guards: StationAssignedUser[] = usersData
            .filter(
              (u: UserAccount) =>
                (u.accountType || "").toUpperCase() === "GUARD"
            )
            .map((u) => ({
              id: u.accountID,
              username: u.username,
              accountType: u.accountType,
            }));

          setAllGuards(guards);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error(err);
          setError(err?.message || "Failed to load stations or guards");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchStationsAndGuards();
    return () => {
      cancelled = true;
    };
  }, []);

  // When a station is selected, fetch its assigned guards
  useEffect(() => {
    let cancelled = false;

    const fetchGuardsForStation = async () => {
      if (selectedStationId == null) {
        setAssignedUsers([]);
        setSelectedGuardIds([]);
        return;
      }

      try {
        setGuardsLoading(true);
        const guards = await getStationGuards(selectedStationId);
        if (!cancelled) {
          setAssignedUsers(guards);
          setSelectedGuardIds(guards.map((g) => g.id));
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error(err);
          setError(err?.message || "Failed to load guards for station");
        }
      } finally {
        if (!cancelled) {
          setGuardsLoading(false);
        }
      }
    };

    fetchGuardsForStation();
    return () => {
      cancelled = true;
    };
  }, [selectedStationId]);

  // Filter stations by type + active flag
  const filteredStations = stations.filter((s) => {
    const rawType = (s.stationType || "").toLowerCase();
    const name = (s.name || "").toLowerCase();

    let matchesType = false;

    if (rawType === "gate" || rawType === "building") {
      matchesType = rawType === currentType;
    } else {
      // Legacy / broken rows with no type – fall back to name or show them so you can fix
      if (!name) {
        matchesType = true; // show in both tabs to allow renaming
      } else if (currentType === "gate") {
        matchesType = name.includes("gate");
      } else {
        matchesType = !name.includes("gate");
      }
    }

    if (!matchesType) return false;

    if (!showInactive) {
      return s.active !== false;
    }

    return true;
  });

  const handleToggleStationActive = async (station: StationWithUsers) => {
    const newActive = station.active === false ? true : false;
    const actionLabel = newActive ? "reactivate" : "deactivate";

    const ok = window.confirm(
      `Are you sure you want to ${actionLabel} "${station.name || `station #${station.id}`
      }"?`
    );
    if (!ok) return;

    try {
      const updated = await setStationActive(station.id, newActive);

      setStations((prev) =>
        prev.map((s) => (s.id === station.id ? { ...s, ...updated } : s))
      );

      if (!updated.active && !showInactive && selectedStationId === station.id) {
        setSelectedStationId(null);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to update station status");
    }
  };

  const handleToggleGuardSelection = (guardId: number) => {
    setSelectedGuardIds((prev) =>
      prev.includes(guardId)
        ? prev.filter((id) => id !== guardId)
        : [...prev, guardId]
    );
  };

  const handleSaveAssignments = async () => {
    if (!selectedStationId) return;

    try {
      await updateStationGuards(selectedStationId, selectedGuardIds);
      const updated = await getStationGuards(selectedStationId);
      setAssignedUsers(updated);
      setAssignModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to update station guards");
    }
  };

  // ---------- Add Station ----------

  const openCreateModal = () => {
    setCreateName("");
    setCreateType(currentType);
    setCreateError(null);
    setCreateModalOpen(true);
  };

  const handleCreateStation = async () => {
    setCreateError(null);
    const rawName = createName.trim();

    if (!rawName) {
      setCreateError("Please enter a station name.");
      return;
    }

    const exists = stations.some(
      (s) => (s.name || "").toLowerCase() === rawName.toLowerCase()
    );
    if (exists) {
      setCreateError("A station with that name already exists.");
      return;
    }

    let finalName = rawName;
    if (createType === "gate" && !rawName.toLowerCase().includes("gate")) {
      finalName = `Gate ${rawName}`;
    }

    try {
      setCreateSubmitting(true);

      const created = await createStation({
        name: finalName,
        stationType: createType, // "gate" | "building"
        active: true,
      });

      const newStation: StationWithUsers = {
        ...created,
        active: created.active ?? true,
        stationType: created.stationType ?? createType,
      };

      setStations((prev) => [...prev, newStation]);
      setCreateModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setCreateError(err?.message || "Failed to create station.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // ---------- Edit Station ----------

  const openRenameModal = () => {
    if (!selectedStation) return;

    setRenameName(selectedStation.name || "");

    const rawType = (selectedStation.stationType || "").toLowerCase();
    if (rawType === "gate" || rawType === "building") {
      setRenameType(rawType as "gate" | "building");
    } else {
      setRenameType(currentType);
    }

    setRenameError(null);
    setRenameModalOpen(true);
  };

  const handleRenameStation = async () => {
    if (!selectedStation) return;

    const rawName = renameName.trim();
    if (!rawName) {
      setRenameError("Please enter a station name.");
      return;
    }

    let finalName = rawName;
    if (renameType === "gate" && !rawName.toLowerCase().includes("gate")) {
      finalName = `Gate ${rawName}`;
    }

    const stationTypeValue = renameType; // "gate" | "building"

    try {
      setRenameSubmitting(true);

      const updated = await updateStation({
        id: selectedStation.id,
        name: finalName,
        active: selectedStation.active,
        stationType: stationTypeValue,
      });

      setStations((prev) =>
        prev.map((s) =>
          s.id === selectedStation.id
            ? {
              ...s,
              ...updated,
              active: updated.active ?? s.active ?? true,
              stationType:
                updated.stationType ??
                stationTypeValue ??
                s.stationType ??
                null,
            }
            : s
        )
      );

      setRenameModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setRenameError(err?.message || "Failed to rename station.");
    } finally {
      setRenameSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4 gap-4">
  <p className="text-xl font-semibold">Stations</p>

  <div className="flex flex-wrap items-center gap-3">
    <div className="space-x-2">
      <Button
        className="text-white"
        onClick={() => setCurrentType("gate")}
        variation={currentType === "gate" ? "primary" : "secondary"}
      >
        Gates
      </Button>
      <Button
        className="text-white"
        onClick={() => setCurrentType("building")}
        variation={currentType === "building" ? "primary" : "secondary"}
      >
        Buildings
      </Button>
    </div>
    <CheckboxTile
      checked={showInactive}
      onChange={setShowInactive}
      label="Show deactivated"
      className="text-sm"
    />
    <Button
      type="button"
      variation="primary"
      className="whitespace-nowrap"
      onClick={openCreateModal}
    >
      Add Station
    </Button>
  </div>
</div>

      <div className="flex gap-4 h-full min-h-0">
  {/* LEFT: Station list */}
  <div className="w-80 flex-shrink-0 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
    {loading && <p>Loading stations...</p>}

    {!loading && error && (
      <p className="text-red-500 text-sm">{error}</p>
    )}

    {!loading && !error && filteredStations.length === 0 && (
      <p className="text-sm text-slate-500">
        No stations found for this category.
      </p>
    )}

    {!loading && !error && filteredStations.length > 0 && (
      <>
        {filteredStations.map((station) => {
          const isActive = station.active !== false;

          return (
            <div
              key={station.id}
              className={`flex items-center justify-between w-full p-2 rounded border-2 ${
                selectedStationId === station.id
                  ? "bg-yellow-500 border-yellow-300"
                  : "bg-yellow-600 border-yellow-300/40"
              }`}
            >
              <button
                onClick={() => setSelectedStationId(station.id)}
                className="flex-1 text-left text-lg"
              >
                {station.name || `Unnamed station #${station.id}`}
                {!isActive && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-500/80 text-white">
                    Inactive
                  </span>
                )}
              </button>

              <Button
                variation={isActive ? "secondary" : "primary"}
                className="ml-2 text-xs px-2 py-1"
                onClick={() => handleToggleStationActive(station)}
              >
                {isActive ? "Deactivate" : "Reactivate"}
              </Button>
            </div>
          );
        })}
      </>
    )}
  </div>

  {/* RIGHT: Station details */}
  <div className="flex-1 flex flex-col p-3 rounded border-2 overflow-y-auto custom-scrollbar">
    {selectedStation ? (
      <>
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-2xl">
            Personnels –{" "}
            {selectedStation.name ||
              `Unnamed station #${selectedStation.id}`}
          </h1>
          <div className="flex gap-2 items-center">
            <Button
              variation="secondary"
              onClick={() => setAssignModalOpen(true)}
            >
              Assign...
            </Button>
            <Button variation="secondary" onClick={openRenameModal}>
              Edit
            </Button>
            <Button
              onClick={() => setSelectedStationId(null)}
              className="text-sm"
            >
              Close
            </Button>
          </div>
        </div>

        {guardsLoading ? (
          <p className="text-sm text-slate-500">Loading guards...</p>
        ) : assignedUsers.length > 0 ? (
          <div className="space-y-1">
            {assignedUsers.map((u) => (
              <p key={u.id}>
                {u.username}{" "}
                <span className="text-xs text-slate-500">
                  ({u.accountType})
                </span>
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No guards assigned to this station yet.
          </p>
        )}
      </>
    ) : (
      <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
        Select a station from the left to view details.
      </div>
    )}
  </div>
</div>

      {/* Assign Guards modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Guards"
      >
        <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
          {allGuards.length === 0 && (
            <p className="text-sm text-slate-500">
              No guard accounts available.
            </p>
          )}

          {allGuards.map((g) => (
            <label
              key={g.id}
              className="flex items-center gap-2 text-sm text-white"
            >
              <CheckboxTile
                checked={selectedGuardIds.includes(g.id)}
                onChange={() => handleToggleGuardSelection(g.id)}
                label={g.username}
              />
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variation="secondary"
            onClick={() => setAssignModalOpen(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveAssignments}>Save</Button>
        </div>
      </Modal>

      {/* Create Station modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add Station"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block mb-1 text-sm text-white/80">
              Station Type
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variation={createType === "gate" ? "primary" : "secondary"}
                onClick={() => setCreateType("gate")}
              >
                Gate
              </Button>
              <Button
                type="button"
                variation={createType === "building" ? "primary" : "secondary"}
                onClick={() => setCreateType("building")}
              >
                Building
              </Button>
            </div>
          </div>

          <div>
            <label className="block mb-1 text-sm text-white/80">
              Station Name
            </label>
            <Input
              className="w-full"
              placeholder={
                createType === "gate" ? "e.g. Gate 3" : "e.g. Main Lobby"
              }
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />
            <p className="text-xs text-white/60 mt-1">
              For gates, names containing &quot;Gate&quot; will be treated as
              entry/exit points in the system.
            </p>
            {createError && (
              <p className="text-xs text-red-400 mt-1">{createError}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variation="secondary"
              type="button"
              onClick={() => setCreateModalOpen(false)}
              disabled={createSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateStation}
              disabled={createSubmitting}
            >
              {createSubmitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Station modal */}
      <Modal
        isOpen={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        title="Edit Station"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block mb-1 text-sm text-white/80">
              Station Type
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variation={renameType === "gate" ? "primary" : "secondary"}
                onClick={() => setRenameType("gate")}
              >
                Gate
              </Button>
              <Button
                type="button"
                variation={
                  renameType === "building" ? "primary" : "secondary"
                }
                onClick={() => setRenameType("building")}
              >
                Building
              </Button>
            </div>
          </div>

          <div>
            <label className="block mb-1 text-sm text-white/80">
              Station Name
            </label>
            <Input
              className="w-full"
              placeholder={
                renameType === "gate" ? "e.g. Gate 1" : "e.g. Main Lobby"
              }
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
            />
            <p className="text-xs text-white/60 mt-1">
              For gates, names containing &quot;Gate&quot; will be treated as
              entry/exit points in the system.
            </p>
            {renameError && (
              <p className="text-xs text-red-400 mt-1">{renameError}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variation="secondary"
              type="button"
              onClick={() => setRenameModalOpen(false)}
              disabled={renameSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRenameStation}
              disabled={renameSubmitting}
            >
              {renameSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
