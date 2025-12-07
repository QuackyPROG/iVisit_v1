// src/pages/ManagePasses/ManagePasses.tsx
import { useEffect, useMemo, useState } from "react";
import { useCookies } from "react-cookie";

import DashboardLayout from "../../layouts/DashboardLayout";
import Meta from "../../utils/Meta";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { Table, Thead, Tbody, Tr, Th, Td } from "../../components/common/Table";
import Select from "../../components/common/Select";
import { useToast } from "../../contexts/ToastContext";

import {
  getAllPasses, createPass, updatePassStatus,
  updatePassMetadata, type VisitorPass, getPassLabel,
  getAllStations, type Station,
  listPassIncidents, type VisitorPassIncident,
  closePassIncident,
} from "../../api/Index";

import { readCardUID } from "../../hooks/readCard";

type StatusFilter = "all" | "available" | "in_use" | "lost" | "inactive";

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
}

export default function ManagePasses() {
  Meta({ title: "Manage Visitor Passes - iVisit" });
  
  const { showToast } = useToast();
  const [cookies] = useCookies(["role"]);

  const role = cookies.role as "admin" | "guard" | "support" | undefined;
  const isAdmin = role === "admin";

  const [passes, setPasses] = useState<VisitorPass[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [incidents, setIncidents] = useState<VisitorPassIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Add modal state
  const [addOpen, setAddOpen] = useState(false);
  const [addLabel, setAddLabel] = useState(""); // displayCode
  const [addUid, setAddUid] = useState(""); // RFID UID (passNumber)
  const [addOriginStationId, setAddOriginStationId] =
    useState<number | "">("");

  // RFID state for Add
  const [rfidStatus, setRfidStatus] = useState<string | null>(null);
  const [rfidLoading, setRfidLoading] = useState(false);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editPass, setEditPass] = useState<VisitorPass | null>(null);
  const [editLabel, setEditLabel] = useState(""); // displayCode
  const [editUid, setEditUid] = useState(""); // read-only UID
  const [editOriginStationId, setEditOriginStationId] =
    useState<number | "">("");

  // Confirm dialog
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Incidents modal state
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [incidentModalPass, setIncidentModalPass] = useState<VisitorPass | null>(null);
  const [incidentModalItems, setIncidentModalItems] = useState<VisitorPassIncident[]>([]);

  const refreshPasses = async () => {
    const data = await getAllPasses();
    setPasses(data);
  };

  useEffect(() => {
    async function fetchAll() {
      try {
        setLoading(true);

        // basic core data
        const [passesData, stationsData] = await Promise.all([
          getAllPasses(),
          getAllStations(),
        ]);
        setPasses(passesData);
        setStations(stationsData);

        // incidents are "nice to have" – don't break page if it fails
        try {
          const incidentsData = await listPassIncidents();
          setIncidents(incidentsData);
        } catch (e) {
          console.warn("Failed to load pass incidents:", e);
          setIncidents([]);
        }

        setError(null);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load visitor passes.");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // Helper: stationId -> name
  const getOriginNameById = (
    id: number | "" | null | undefined
  ): string | null => {
    if (!id && id !== 0) return null;
    const found = stations.find((s) => s.id === id);
    return found?.name ?? null;
  };

  // Helper: incident counts for a given pass
  const getIncidentCounts = (passId: number) => {
    const related = incidents.filter((i) => i.passId === passId);
    const openCount = related.filter(
      (i) => (i.status || "").toUpperCase() === "OPEN"
    ).length;
    return { total: related.length, open: openCount };
  };

  const openIncidentModalForPass = (pass: VisitorPass) => {
    const related = incidents.filter((i) => i.passId === pass.passID);
    setIncidentModalPass(pass);
    setIncidentModalItems(related);
    setIncidentModalOpen(true);
  };

  const filteredPasses = useMemo(() => {
    const term = search.trim().toLowerCase();

    return passes.filter((p) => {
      const status = (p.status || "").toLowerCase();

      if (statusFilter === "available" && status !== "available") return false;
      if (statusFilter === "in_use" && status !== "in_use") return false;
      if (statusFilter === "lost" && status !== "lost") return false;
      if (
        statusFilter === "inactive" &&
        status !== "inactive" &&
        status !== "retired"
      )
        return false;

      if (!term) return true;

      const label = getPassLabel(p);
      const fields = [
        label,
        p.passNumber ?? "",
        p.visitorPassID ?? "",
        p.originLocation ?? "",
      ];

      return fields.some((f) => f.toLowerCase().includes(term));
    });
  }, [passes, search, statusFilter]);

  const lostCount = useMemo(
    () =>
      passes.filter((p) => (p.status || "").toLowerCase() === "lost").length,
    [passes]
  );

  const stationOptions = useMemo(
    () => [
      { label: "None", value: "" },
      ...stations.map((s) => ({
        label: s.name,
        value: String(s.id),
      })),
    ],
    [stations]
  );

  const openAddModal = () => {
    setAddLabel("");
    setAddUid("");
    setAddOriginStationId("");
    setRfidStatus(null);
    setRfidLoading(false);
    setAddOpen(true);
  };

  const handleReadRfidForAdd = async () => {
    setRfidStatus(null);
    setRfidLoading(true);

    try {
      const result = await readCardUID();

      if (!result.success || !result.uid) {
        setRfidStatus(
          result.message || "No card detected. Please tap a card again."
        );
        setAddUid("");
        return;
      }

      const uid = result.uid; // e.g. "865A4BA6"
      setAddUid(uid);
      setRfidStatus(`Card detected. UID: ${uid}`);
    } catch (err: any) {
      console.error("RFID read error (ManagePasses add):", err);
      setRfidStatus(err?.message || "Failed to read RFID card.");
      setAddUid("");
    } finally {
      setRfidLoading(false);
    }
  };

  const handleCreatePass = async () => {
    if (!addLabel.trim()) {
      showToast("Please enter a pass label / number.", {
        variant: "warning",
      });
      return;
    }

    if (!addUid.trim()) {
      showToast("Please tap a card to capture its UID.", {
        variant: "warning",
      });
      return;
    }

    try {
      // passNumber = RFID UID (hex)
      const created = await createPass(addUid.trim().toUpperCase(), undefined, "AVAILABLE");

      // Origin location from station name (we still store human-readable name here)
      let originName: string | undefined;
      if (addOriginStationId !== "") {
        const resolved = getOriginNameById(addOriginStationId as number);
        originName = resolved || undefined;
      }

      await updatePassMetadata(created.passID, {
        displayCode: addLabel.trim(),
        originLocation: originName,
        // visitorPassID left alone; reserved for external DB if ever needed
      });

      await refreshPasses();
      setAddOpen(false);
      showToast("Visitor pass created.", { variant: "success" });
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to create pass.", {
        variant: "error",
      });
    }
  };

  const openEditModal = (pass: VisitorPass) => {
    setEditPass(pass);
    setEditLabel(pass.displayCode || pass.passNumber || "");
    setEditUid(pass.passNumber || ""); // show UID, but don't edit

    // Map originLocation back to stationId if name matches
    if (pass.originLocation) {
      const found = stations.find((s) => s.name === pass.originLocation);
      if (found) {
        setEditOriginStationId(found.id);
      } else {
        setEditOriginStationId("");
      }
    } else {
      setEditOriginStationId("");
    }

    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editPass) return;

    try {
      let originName: string | undefined;
      if (editOriginStationId !== "") {
        const resolved = getOriginNameById(editOriginStationId as number);
        originName = resolved || undefined;
      }

      await updatePassMetadata(editPass.passID, {
        displayCode: editLabel.trim() || undefined,
        originLocation: originName,
      });

      await refreshPasses();
      setEditOpen(false);
      setEditPass(null);
      showToast("Visitor pass updated.", { variant: "success" });
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to update pass.", {
        variant: "error",
      });
    }
  };

  const handleStatusChange = async (pass: VisitorPass, newStatus: string) => {
    const normalized = newStatus.toUpperCase();

    if (normalized === "IN_USE") {
      showToast("IN_USE status is controlled by Guard check-in/out.", {
        variant: "warning",
      });
      return;
    }

    try {
      await updatePassStatus(pass.passID, normalized);
      await refreshPasses();
      showToast(`Pass set to ${normalized}.`, { variant: "success" });
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to update status.", {
        variant: "error",
      });
    }
  };

  const handleSetInactive = (pass: VisitorPass) => {
    const label = getPassLabel(pass);

    setConfirmState({
      open: true,
      title: "Set Pass Inactive",
      message: `Set pass "${label}" to INACTIVE? It will no longer be assignable but will remain in records.`,
      confirmLabel: "Set Inactive",
      cancelLabel: "Cancel",
      onConfirm: async () => {
        await updatePassStatus(pass.passID, "INACTIVE");
        await refreshPasses();
        showToast("Pass set to INACTIVE.", { variant: "success" });
      },
    });
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <p className="text-center text-red-400 mt-8">
          You do not have permission to access this page.
        </p>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <p className="text-gray-400 text-center mt-8">
          Loading visitor passes...
        </p>
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
        <div>
          <p className="text-xl">Manage Visitor Passes</p>
          <p className="text-xs text-slate-400">
            Lost passes: {lostCount} · Total: {passes.length}
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-2 md:items-center w-full md:w-auto">
          {/* Status filter — native <select> */}
          <div className="flex items-center gap-2">
            <span className="text-slate-300 text-xs">Status:</span>
            <select
              className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs md:w-40"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">All</option>
              <option value="available">Available</option>
              <option value="in_use">In Use</option>
              <option value="lost">Lost</option>
              <option value="inactive">Inactive/Retired</option>
            </select>
          </div>
          {/* Search */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Input
              className="text-dark-gray w-full md:w-56"
              placeholder="Search label, UID, origin..."
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Button className="md:ml-2" onClick={openAddModal}>
            + Add Pass
          </Button>
        </div>
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th>Label</Th>
            <Th>Card UID (hex)</Th>
            <Th>Status</Th>
            <Th>Origin Location</Th>
            <Th>Incidents</Th>
            <Th className="text-right">Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredPasses.map((p) => {
            const status = (p.status || "").toUpperCase();
            const label = getPassLabel(p);
            const uidText = p.passNumber || p.visitorPassID || "—";

            let statusClass = "text-slate-300";
            if (status === "AVAILABLE") statusClass = "text-green-400";
            else if (status === "IN_USE") statusClass = "text-blue-400";
            else if (status === "LOST") statusClass = "text-red-400";
            else if (status === "INACTIVE" || status === "RETIRED")
              statusClass = "text-yellow-400";

            const { total, open } = getIncidentCounts(p.passID);

            return (
              <Tr key={p.passID}>
                <Td>{label}</Td>
                <Td>{uidText}</Td>
                <Td>
                  <span className={statusClass}>{status}</span>
                </Td>
                <Td>{p.originLocation ?? "N/A"}</Td>
                <Td>
                  {total === 0 ? (
                    <span className="text-xs text-slate-400">None</span>
                  ) : (
                    <button
                      type="button"
                      className="text-xs underline text-slate-200 hover:text-yellow-300"
                      onClick={() => openIncidentModalForPass(p)}
                    >
                      {open > 0 ? (
                        <>
                          <span className="font-semibold">{open} open</span>
                          <span className="text-slate-300"> / {total} total</span>
                        </>
                      ) : (
                        <>
                          <span className="text-green-300">0 open</span>
                          <span className="text-slate-300"> / {total} total</span>
                        </>
                      )}
                    </button>
                  )}
                </Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    {status !== "IN_USE" && (
                      <Button
                        variation="secondary"
                        className="text-xs px-2 py-1"
                        onClick={() => openEditModal(p)}
                      >
                        Edit
                      </Button>
                    )}

                    {/* Status actions */}
                    {status !== "IN_USE" && status !== "AVAILABLE" && (
                      <Button
                        variation="secondary"
                        className="text-xs px-2 py-1"
                        onClick={() => handleStatusChange(p, "AVAILABLE")}
                      >
                        Set Available
                      </Button>
                    )}

                    {status === "AVAILABLE" && (
                      <>
                        <Button
                          variation="secondary"
                          className="text-xs px-2 py-1"
                          onClick={() => handleStatusChange(p, "LOST")}
                        >
                          Mark Lost
                        </Button>
                        <Button
                          variation="secondary"
                          className="text-xs px-2 py-1"
                          onClick={() => handleSetInactive(p)}
                        >
                          Set Inactive
                        </Button>
                      </>
                    )}
                  </div>
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>

      {/* Add Pass Modal */}
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Visitor Pass"
      >
        <div className="flex flex-col gap-3 text-white">
          <div>
            <p className="text-sm mb-1">Label / Printed Code</p>
            <Input
              placeholder="e.g. 001, A-03"
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
            />
          </div>

          <div>
            <p className="text-sm mb-1">
              Card UID (hex)
              <span className="text-[10px] text-slate-400 ml-1">
                (tap card to fill)
              </span>
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Tap a card to capture UID"
                value={addUid}
                readOnly
              />
              <Button
                type="button"
                variation="secondary"
                className="text-xs px-3 py-1 whitespace-nowrap"
                disabled={rfidLoading}
                onClick={handleReadRfidForAdd}
              >
                {rfidLoading ? "Reading..." : "Tap card"}
              </Button>
            </div>
            {rfidStatus && (
              <p className="text-[11px] text-slate-400 mt-1">{rfidStatus}</p>
            )}
          </div>

          <div>
            <p className="text-sm mb-1">Origin Station (optional)</p>
            <Select
              id="origin-station-add"
              value={
                addOriginStationId === ""
                  ? ""
                  : String(addOriginStationId)
              }
              options={stationOptions}
              placeholder="Select origin station"
              onChange={(value) => {
                setAddOriginStationId(
                  value === "" ? "" : Number(value)
                );
              }}
            />
          </div>

          <div className="flex justify-end gap-2 mt-3">
            <Button variation="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePass}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Pass Modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditPass(null);
        }}
        title="Edit Visitor Pass"
      >
        {editPass && (
          <div className="flex flex-col gap-3 text-white">
            <p className="text-xs text-slate-400">
              Internal ID: #{editPass.passID} · Current status:{" "}
              {(editPass.status || "").toUpperCase()}
            </p>

            <div>
              <p className="text-sm mb-1">Label / Printed Code</p>
              <Input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
              />
            </div>

            <div>
              <p className="text-sm mb-1">Card UID (hex)</p>
              <Input value={editUid} readOnly />
            </div>

            <div>
              <p className="text-sm mb-1">Origin Station</p>
              <Select
                id="origin-station-edit"
                value={
                  editOriginStationId === ""
                    ? ""
                    : String(editOriginStationId)
                }
                options={stationOptions}
                placeholder="Select origin station"
                onChange={(value) => {
                  setEditOriginStationId(
                    value === "" ? "" : Number(value)
                  );
                }}
              />
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <Button
                variation="secondary"
                onClick={() => {
                  setEditOpen(false);
                  setEditPass(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>Save</Button>
            </div>
          </div>
        )}
      </Modal>
      {/* Pass Incidents Modal */}
      <Modal
        isOpen={incidentModalOpen}
        onClose={() => {
          setIncidentModalOpen(false);
          setIncidentModalPass(null);
          setIncidentModalItems([]);
        }}
        title={
          incidentModalPass
            ? `Incidents for ${getPassLabel(incidentModalPass)}`
            : "Pass Incidents"
        }
      >
        <div className="flex flex-col gap-3 text-white text-sm max-h-80 overflow-y-auto">
          {incidentModalItems.length === 0 ? (
            <p className="text-slate-300 text-xs">
              No incidents recorded for this pass.
            </p>
          ) : (
            <ul className="space-y-3">
              {incidentModalItems.map((inc) => (
                <div key={inc.incidentId} className="border-b border-white/10 pb-2 mb-2">
                  <p className="text-sm">
                    <span className="font-semibold">{inc.incidentType}</span>
                    {" — "}
                    <span className={
                      inc.status === "OPEN"
                        ? "text-red-400"
                        : "text-green-400"
                    }>
                      {inc.status}
                    </span>
                  </p>

                  {inc.description && (
                    <p className="text-xs text-slate-300 mt-1">{inc.description}</p>
                  )}

                  <p className="text-[10px] text-slate-400 mt-1">
                    Reported: {new Date(inc.reportedAt).toLocaleString()}
                  </p>

                  {inc.status === "CLOSED" && inc.resolvedAt && (
                    <p className="text-[10px] text-green-400 mt-1">
                      Closed: {new Date(inc.resolvedAt).toLocaleString()}
                    </p>
                  )}

                  {/* Close button for OPEN incidents */}
                  {inc.status === "OPEN" && (
                    <div className="mt-2">
                      <Button
                        variation="secondary"
                        className="text-xs px-2 py-1"
                        onClick={async () => {
                          try {
                            const notes = prompt(
                              "Enter resolution notes (optional):",
                              ""
                            ) || undefined;

                            await closePassIncident(inc.incidentId, notes);

                            // Refresh from backend
                            const updated = await listPassIncidents();
                            setIncidents(updated);

                            // Refresh modal contents
                            const filtered = updated.filter(
                              (i) => i.passId === incidentModalPass?.passID
                            );
                            setIncidentModalItems(filtered);

                            showToast("Incident closed.", { variant: "success" });
                          } catch (err: any) {
                            showToast(err.message || "Failed to close incident.", {
                              variant: "error",
                            });
                          }
                        }}
                      >
                        Close Incident
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </ul>
          )}

          <div className="flex justify-end mt-3">
            <Button
              variation="secondary"
              onClick={() => {
                setIncidentModalOpen(false);
                setIncidentModalPass(null);
                setIncidentModalItems([]);
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>


      {/* Confirm Dialog */}
      {confirmState && (
        <ConfirmDialog
          isOpen={confirmState.open}
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          cancelLabel={confirmState.cancelLabel}
          loading={confirmLoading}
          onCancel={() => {
            if (confirmLoading) return;
            setConfirmState((prev) =>
              prev ? { ...prev, open: false } : prev
            );
          }}
          onConfirm={async () => {
            if (!confirmState?.onConfirm) return;
            try {
              setConfirmLoading(true);
              await confirmState.onConfirm();
            } finally {
              setConfirmLoading(false);
              setConfirmState((prev) =>
                prev ? { ...prev, open: false } : prev
              );
            }
          }}
        />
      )}
    </DashboardLayout>
  );
}
