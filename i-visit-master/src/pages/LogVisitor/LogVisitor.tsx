// src/pages/LogVisitor/LogVisitor.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useCookies } from "react-cookie";
import { useLocation, useNavigate } from "react-router-dom";

import DashboardLayout from "../../layouts/DashboardLayout";
import Meta from "../../utils/Meta";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import PaginationControls from "../../components/common/PaginationControls";
import { Table, Thead, Tbody, Tr, Th, Td } from "../../components/common/Table";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { useToast } from "../../contexts/ToastContext";
import { useRfidPollingControl } from "../../features/rfid/RfidPollingContext";
import {
    VISITOR_TYPE_FILTER_VALUES,
    normalizeVisitorType,
} from "../../constants/visitorTypes";
import { sortGateAware } from "../../utils/locationSort";

import {
    listVisitors,
    type Visitor,
    getActiveLogs,
    getAllLogEntries,
    endVisitorLogResilient,
    type VisitorLogDTO,
    type VisitorLogEntryDTO,
    getAllStations,
    type Station,
    getPassByUid,
    getAllPasses,
    type VisitorPass,
    recordLogEntryResilient,
    grantPassToLog,
    revokePassFromLog,
    createVisitorLogResilient,
    reportPassIncident,
} from "../../api/Index";

import { VisitorProfileModal } from "./VisitorProfileModal";
import { StartLogModal } from "./StartLogModal";
import { IncidentReportModal } from "./IncidentReportModal";
import { LogDetailsModal } from "./LogDetailsModal";

import { readCardUID } from "../../hooks/readCard";

export default function LogVisitor() {
    Meta({ title: "Log Visitor - iVisit" });

    const { showToast } = useToast();
    const [cookies] = useCookies(["userId", "stationId", "role"]);
    const { setPollingEnabled } = useRfidPollingControl();

    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [activeLogs, setActiveLogs] = useState<VisitorLogDTO[]>([]);
    const [logEntries, setLogEntries] = useState<VisitorLogEntryDTO[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [passes, setPasses] = useState<VisitorPass[]>([]);
    const [locallyLockedPassIds, setLocallyLockedPassIds] = useState<number[]>([]);

    // RFID + pass state for Start Log
    const [rfidStatus, setRfidStatus] = useState<string | null>(null);
    const [rfidLoading, setRfidLoading] = useState(false);
    const [startPassInternalId, setStartPassInternalId] = useState<number | null>(
        null
    );

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<
        "all" | "active" | "inactive"
    >("all");
    const [entryFilter, setEntryFilter] = useState<string>("all");
    const [visitorTypeFilter, setVisitorTypeFilter] = useState<string>("all");

    // Client-side pagination
    const [page, setPage] = useState(0);      // 0-based
    const [pageSize, setPageSize] = useState(25);

    type ConfirmState = {
        open: boolean;
        title: string;
        message: string;
        confirmLabel?: string;
        cancelLabel?: string;
        onConfirm: () => Promise<void> | void;
    };

    const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
    const [confirmLoading, setConfirmLoading] = useState(false);

    // modals
    const [profileOpen, setProfileOpen] = useState(false);
    const [profileVisitor, setProfileVisitor] = useState<Visitor | null>(null);

    const [startModalOpen, setStartModalOpen] = useState(false);
    const [startVisitor, setStartVisitor] = useState<Visitor | null>(null);
    const [startPurpose, setStartPurpose] = useState("");
    const [startPassId, setStartPassId] = useState("");
    const [startAllowedStationIds, setStartAllowedStationIds] = useState<
        number[]
    >([]);

    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsVisitor, setDetailsVisitor] = useState<Visitor | null>(null);
    const [detailsLog, setDetailsLog] = useState<VisitorLogDTO | null>(null);
    const [detailsEntries, setDetailsEntries] = useState<VisitorLogEntryDTO[]>(
        []
    );
    const [detailsLoading, setDetailsLoading] = useState(false);

    // pass + RFID state for building Grant Pass (details modal)
    const [detailsPassCode, setDetailsPassCode] = useState<string>("");
    const [detailsPassInternalId, setDetailsPassInternalId] = useState<
        number | null
    >(null);
    const [detailsRfidStatus, setDetailsRfidStatus] = useState<string | null>(
        null
    );
    const [detailsRfidLoading, setDetailsRfidLoading] = useState(false);

    const [incidentOpen, setIncidentOpen] = useState(false);
    const [incidentType, setIncidentType] = useState<string>("LOST");
    const [incidentDescription, setIncidentDescription] = useState<string>("");

    const location = useLocation();
    const navigate = useNavigate();

    const [focusVisitorId, setFocusVisitorId] = useState<number | null>(null);
    const [focusPurpose, setFocusPurpose] = useState<string | null>(null);

    const currentUserId =
        cookies.userId != null ? Number(cookies.userId) : null;
    const currentStationId =
        cookies.stationId != null ? Number(cookies.stationId) : null;

    const currentStation = useMemo(
        () => stations.find((s) => s.id === currentStationId) ?? null,
        [stations, currentStationId]
    );

    const isGateStation = useMemo(() => {
        if (!currentStation || !currentStation.name) return false;
        return currentStation.name.toLowerCase().includes("gate");
    }, [currentStation]);

    const showBuildingPassControls = !!(currentStation && !isGateStation);

    // GATE-based entry options, not "whatever is in active logs"
    const entryLocationOptions = useMemo(() => {
        const set = new Set<string>();

        stations.forEach((s) => {
            const name = (s.name || "").trim();
            if (!name) return;

            const type = (s as any).stationType?.toString().toUpperCase?.() ?? "";

            if (type === "GATE") {
                set.add(name);
                return;
            }

            if (!type && name.toLowerCase().includes("gate")) {
                set.add(name);
            }
        });

        return sortGateAware(Array.from(set));
    }, [stations]);

    // Unique visitor types (Student, Regular, Contractor, etc.)
    const visitorTypeOptions = VISITOR_TYPE_FILTER_VALUES;

    const findPassOfflineByUid = (uid: string): VisitorPass | null => {
        if (!uid) return null;

        const normalizedUid = uid.trim().toUpperCase();

        const byExternalId = passes.find(
            (p) => (p as any).visitorPassID === uid
        );

        const byPassNumber = passes.find((p) => {
            const num =
                ((p as any).passNumber ??
                    (p as any).pass_number ??
                    "").toString().toUpperCase();
            return num === normalizedUid;
        });

        const pass = byExternalId ?? byPassNumber ?? null;
        if (!pass) return null;

        if (locallyLockedPassIds.includes(pass.passID)) {
            return null;
        }

        const rawStatus = (pass as any).status as string | undefined;
        const status = rawStatus ? rawStatus.trim().toUpperCase() : "AVAILABLE";

        if (status === "LOST" || status === "INACTIVE" || status === "RETIRED") {
            return null;
        }

        return pass;
    };

    // --- clear ScanId focus + URL params ---
    const clearScanFocus = useCallback(() => {
        setFocusVisitorId(null);
        setFocusPurpose(null);

        // Reset search so the list shows everyone again
        setSearch("");

        // Strip query parameters so ScanId hint doesn't linger in the URL
        navigate("/dashboard/log-visitor", { replace: true });
    }, [navigate, setSearch]);

    // initial load
    useEffect(() => {
        async function fetchAll() {
            try {
                setLoading(true);
                const [
                    visitorsData,
                    activeLogsData,
                    entriesData,
                    stationsData,
                    passesData,
                ] = await Promise.all([
                    listVisitors(),
                    getActiveLogs(),
                    getAllLogEntries(),
                    getAllStations(),
                    getAllPasses(),
                ]);

                setVisitors(visitorsData);
                setActiveLogs(activeLogsData);
                setLogEntries(entriesData);
                setStations(stationsData);
                setPasses(passesData);
                setError(null);
            } catch (err: any) {
                console.error(err);
                setError(err.message || "Failed to load data for logging visitors.");
            } finally {
                setLoading(false);
            }
        }

        fetchAll();
    }, []);

    // read query params: focus + purpose
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const focus = params.get("focus");
        const purpose = params.get("purpose");

        if (focus) {
            const n = Number(focus);
            if (!Number.isNaN(n)) setFocusVisitorId(n);
        } else {
            setFocusVisitorId(null);
        }

        setFocusPurpose(purpose || null);
    }, [location.search]);

    // once visitors are loaded, if we have a focus ID, set search to that visitor's name
    useEffect(() => {
        if (focusVisitorId != null && visitors.length > 0) {
            const v = visitors.find((x) => x.visitorID === focusVisitorId);
            if (v) {
                setSearch(v.visitorName);
            }
        }
    }, [focusVisitorId, visitors]);

    // auto-clear ScanId focus after some time if Start Log is never opened
    useEffect(() => {
        if (focusVisitorId == null) return;

        const timeoutId = window.setTimeout(() => {
            clearScanFocus();
        }, 120_000); // 2 minutes; adjust as needed

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [focusVisitorId, clearScanFocus]);

    // helper: find active log for a given visitor name (by name match)
    const getActiveLogForVisitor = (visitorId: number): VisitorLogDTO | undefined => {
        return activeLogs.find((log) => log.visitorID === visitorId);
    };

    const filteredVisitors = useMemo(() => {
        const term = search.trim().toLowerCase();

        return visitors.filter((v) => {
            const log = getActiveLogForVisitor(v.visitorID);

            const isActive = !!log;
            const firstLocation = log?.firstLocation || "";
            const lastLocation = log?.location || "";
            const passNo = log?.passNo || "";
            const normalizedVisitorType = normalizeVisitorType(v.visitorType);

            // --- 1) Status filter ---
            if (statusFilter === "active" && !isActive) return false;
            if (statusFilter === "inactive" && isActive) return false;

            // --- 2) Entry via (firstLocation) filter ---
            if (entryFilter !== "all") {
                if (
                    !firstLocation ||
                    firstLocation.toLowerCase() !== entryFilter.toLowerCase()
                ) {
                    return false;
                }
            }

            // --- 3) Visitor type filter ---
            if (visitorTypeFilter !== "all") {
                if (
                    !normalizedVisitorType ||
                    normalizedVisitorType !== visitorTypeFilter
                ) {
                    return false;
                }
            }

            // --- 4) Text search (global, across visitor + log fields) ---
            if (!term) return true; // no search text -> passes if filters pass

            const searchableFields = [
                v.visitorName ?? "",
                normalizedVisitorType,
                v.idNumber ?? "",
                v.idType ?? "",
                v.gender ?? "",
                firstLocation,
                lastLocation,
                passNo,
            ];

            return searchableFields.some((f) => f.toLowerCase().includes(term));
        });
    }, [visitors, activeLogs, search, statusFilter, entryFilter, visitorTypeFilter]);

    // Pagination derived values from filtered list
    const totalElements = filteredVisitors.length;
    const totalPages =
        totalElements === 0 ? 0 : Math.ceil(totalElements / pageSize);

    const currentPage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);

    const pagedVisitors = filteredVisitors.slice(
        currentPage * pageSize,
        currentPage * pageSize + pageSize
    );

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setPage(0);
    };

    const openProfile = (visitor: Visitor) => {
        setProfileVisitor(visitor);
        setProfileOpen(true);
    };

    const closeProfile = () => {
        setProfileOpen(false);
        setProfileVisitor(null);
    };

    const openStartLog = (visitor: Visitor) => {
        const existingLog = getActiveLogForVisitor(visitor.visitorID);
        if (existingLog) {
            showToast(
                "This visitor already has an active log. Use \"Check Log\" instead.",
                { variant: "warning" }
            );
            return;
        }

        setStartVisitor(visitor);

        let defaultPurpose = "";
        if (
            focusVisitorId != null &&
            visitor.visitorID === focusVisitorId &&
            focusPurpose
        ) {
            defaultPurpose = focusPurpose;
            clearScanFocus();
        }
        setStartPurpose(defaultPurpose);

        setStartPassId("");
        setStartPassInternalId(null);
        setRfidStatus(null);
        setRfidLoading(false);

        try {
            const key = `pendingAllowedLocations:${visitor.visitorID}`;
            const raw = sessionStorage.getItem(key);
            if (raw) {
                const names: string[] = JSON.parse(raw);
                const ids = stations
                    .filter((s) => names.includes(s.name))
                    .map((s) => s.id);
                setStartAllowedStationIds(ids);
            } else {
                setStartAllowedStationIds([]);
            }
        } catch (e) {
            console.warn("Failed to load pending locations", e);
            setStartAllowedStationIds([]);
        }

        setStartModalOpen(true);
    };

    const closeStartModal = () => {
        setStartModalOpen(false);
        setRfidStatus(null);
        setRfidLoading(false);
        setStartPassInternalId(null);
    };

    const toggleAllowedStation = (id: number) => {
        setStartAllowedStationIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleReadRfid = async () => {
        setPollingEnabled(false);
        setRfidStatus(null);
        setRfidLoading(true);

        try {
            const result = await readCardUID();
            if (!result.success || !result.uid) {
                setRfidStatus(
                    result.message || "No card detected. Please tap a card again."
                );
                setStartPassInternalId(null);
                return;
            }

            const uid = result.uid;
            setRfidStatus(`Card detected (UID: ${uid}). Looking up pass...`);

            let pass: VisitorPass | null = null;

            try {
                // Try online first
                pass = await getPassByUid(uid);
            } catch (err: any) {
                console.error("Online pass lookup failed, trying offline cache:", err);
                pass = findPassOfflineByUid(uid);
            }

            if (!pass) {
                setRfidStatus(
                    `No usable Visitor Pass is linked to UID ${uid}. ` +
                    `Please register it first or enter a pass code manually.`
                );
                setStartPassInternalId(null);
                return;
            }

            setStartPassInternalId(pass.passID);

            const label =
                (pass as any).displayCode ??
                (pass as any).passNumber ??
                String(pass.passID);

            setStartPassId(label);
            setRfidStatus(`Linked to pass: ${label}`);
        } catch (err: any) {
            console.error("RFID read error:", err);
            setRfidStatus(err?.message || "Failed to read RFID card.");
            setStartPassInternalId(null);
        } finally {
            setRfidLoading(false);
            setPollingEnabled(true);
        }
    };

    const handleStartLog = async () => {
        if (!startVisitor) return;

        if (!startPurpose.trim()) {
            showToast("Please enter a purpose of visit.", { variant: "warning" });
            return;
        }

        // ---- Resolve pass to internal ID (optional) ----
        let passInternalId: number | null = null;

        if (startPassInternalId != null) {
            passInternalId = startPassInternalId;
        } else if (startPassId.trim()) {
            const code = startPassId.trim();

            const found = passes.find(
                (p) =>
                    p.displayCode === code ||
                    p.passNumber === code ||
                    String(p.passID) === code
            );

            if (!found) {
                showToast(`No visitor pass found with code "${code}".`, {
                    variant: "error",
                });
                return;
            }

            if (locallyLockedPassIds.includes(found.passID)) {
                showToast(
                    `Pass "${code}" is already reserved in a pending offline log. Please use another pass or wait for sync.`,
                    { variant: "warning" }
                );
                return;
            }

            passInternalId = found.passID;
        }

        try {
            const result = await createVisitorLogResilient({
                visitorId: startVisitor.visitorID,
                passId: passInternalId,
                purposeOfVisit: startPurpose,
                allowedStationIds: startAllowedStationIds,
                initialStationId: currentStationId ?? null,
                guardAccountId: currentUserId ?? null,
            });

            // also refresh logEntries when we're online
            const wasQueued =
                typeof result === "object" &&
                result !== null &&
                "queued" in result &&
                result.queued === true;

            if (wasQueued && passInternalId != null) {
                setLocallyLockedPassIds((prev) =>
                    prev.includes(passInternalId!) ? prev : [...prev, passInternalId!]
                );
            }

            if (!wasQueued) {
                const [updatedActive, updatedEntries] = await Promise.all([
                    getActiveLogs(),
                    getAllLogEntries(),
                ]);
                setActiveLogs(updatedActive);
                setLogEntries(updatedEntries);
            }

            try {
                const key = `pendingAllowedLocations:${startVisitor.visitorID}`;
                sessionStorage.removeItem(key);
            } catch (e) {
                console.warn("Failed to clear pending locations", e);
            }

            // Reset modal state
            setStartModalOpen(false);
            setStartVisitor(null);
            setStartPurpose("");
            setStartPassId("");
            setStartPassInternalId(null);
            setStartAllowedStationIds([]);
            setRfidStatus(null);
            setRfidLoading(false);

            if (wasQueued) {
                showToast(
                    "Network issue detected. Log has been queued and will sync when the connection is restored.",
                    { variant: "warning" }
                );
            } else {
                showToast("Visitor log started successfully.", {
                    variant: "success",
                });
            }
        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Failed to start log for visitor.", {
                variant: "error",
            });
        }
    };

    const openDetails = (visitor: Visitor, log: VisitorLogDTO) => {
        setDetailsVisitor(visitor);
        setDetailsLog(log);
        setDetailsOpen(true);

        // get only entries for THIS visitorLog session
        const entriesForLog = logEntries.filter(
            (e: any) => e.visitorLogId === log.visitorLogID
        );
        setDetailsEntries(entriesForLog);

        // reset pass controls + RFID status for building modal
        setDetailsPassCode("");
        setDetailsPassInternalId(null);
        setDetailsRfidStatus(null);
        setDetailsRfidLoading(false);
    };

    const closeDetails = () => {
        setDetailsOpen(false);
        setDetailsVisitor(null);
        setDetailsLog(null);
        setDetailsEntries([]);
        setDetailsLoading(false);
        setDetailsPassCode("");
        setDetailsPassInternalId(null);
        setDetailsRfidStatus(null);
        setDetailsRfidLoading(false);
    };

    const endLogNow = async () => {
        if (!detailsLog) return;

        try {
            setDetailsLoading(true);
            const result = await endVisitorLogResilient({
                logId: detailsLog.visitorLogID,
                stationId: currentStationId ?? null,
                guardAccountId: currentUserId ?? null,
            });

            const wasQueued =
                typeof result === "object" &&
                result !== null &&
                "queued" in result &&
                result.queued === true;

            if (!wasQueued) {
                const [updatedActive, updatedEntries] = await Promise.all([
                    getActiveLogs(),
                    getAllLogEntries(),
                ]);
                setActiveLogs(updatedActive);
                setLogEntries(updatedEntries);
            }

            if (wasQueued) {
                showToast(
                    "Network issue detected. Checkout has been queued and will sync when the connection is restored.",
                    { variant: "warning" }
                );
            } else {
                showToast("Visitor checked out successfully.", {
                    variant: "success",
                });
            }

            closeDetails();
        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Failed to end log.", { variant: "error" });
            setDetailsLoading(false);
        }
    };

    const handleEndLog = () => {
        if (!detailsLog) return;

        setConfirmState({
            open: true,
            title: "End Log",
            message: `End log for ${detailsLog.fullName}? This will mark the visitor as checked out.`,
            confirmLabel: "End Log",
            cancelLabel: "Cancel",
            onConfirm: endLogNow,
        });
    };

    // used for "Log Here", not renamed for future retrofitting purposes
    const handleCheckInHere = async () => {
        if (!detailsLog) return;
        if (!currentStationId || !currentUserId) {
            showToast("You must be logged in at a station to record movement.", {
                variant: "warning",
            });
            return;
        }

        try {
            setDetailsLoading(true);

            const result = await recordLogEntryResilient({
                visitorLogId: detailsLog.visitorLogID,
                stationId: currentStationId,
                accountId: currentUserId,
            });

            // If it was online and succeeded, refresh from backend.
            // If it was queued (offline), skip the refresh — it would just fail.
            const wasQueued =
                typeof result === "object" &&
                result !== null &&
                "queued" in result &&
                result.queued === true;

            if (!wasQueued) {
                const updatedEntries = await getAllLogEntries();
                setLogEntries(updatedEntries);

                const entriesForLog = updatedEntries.filter(
                    (e) => e.visitorLogId === detailsLog.visitorLogID
                );
                setDetailsEntries(entriesForLog);

                const updatedActive = await getActiveLogs();
                setActiveLogs(updatedActive);
            }

            if (wasQueued) {
                showToast(
                    "Network issue detected. Movement has been queued and will sync when the connection is restored.",
                    { variant: "warning" }
                );
            } else {
                showToast("Movement recorded.", { variant: "success" });
            }
        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Failed to record movement.", {
                variant: "error",
            });
        } finally {
            setDetailsLoading(false);
            closeDetails();
        }
    };

    const handleGrantPass = async () => {
        if (!detailsLog) return;

        // Resolve to internal pass ID
        let passInternalId = detailsPassInternalId;

        if (!detailsPassCode.trim() && passInternalId == null) {
            showToast("Please enter a pass code first.", { variant: "warning" });
            return;
        }

        if (passInternalId == null) {
            const code = detailsPassCode.trim();

            const found = passes.find(
                (p) =>
                    p.displayCode === code ||
                    p.passNumber === code ||
                    String(p.passID) === code
            );

            if (!found) {
                showToast(`No visitor pass found with code "${code}".`, {
                    variant: "error",
                });
                return;
            }

            passInternalId = found.passID;
        }

        try {
            setDetailsLoading(true);

            await grantPassToLog(detailsLog.visitorLogID, passInternalId);

            const [updatedActive, updatedEntries] = await Promise.all([
                getActiveLogs(),
                getAllLogEntries(),
            ]);
            setActiveLogs(updatedActive);
            setLogEntries(updatedEntries);

            const updatedLog = updatedActive.find(
                (l) => l.visitorLogID === detailsLog.visitorLogID
            );
            if (updatedLog) {
                setDetailsLog(updatedLog);
            }

            const entriesForLog = updatedEntries.filter(
                (e: any) => e.visitorLogId === detailsLog.visitorLogID
            );
            setDetailsEntries(entriesForLog);

            setDetailsPassCode("");
            setDetailsPassInternalId(null);
            setDetailsRfidStatus("Pass granted successfully.");
        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Failed to grant pass.", {
                variant: "error",
            });
        } finally {
            setDetailsLoading(false);
        }
    };

    const revokePassNow = async () => {
        if (!detailsLog) return;

        try {
            setDetailsLoading(true);

            await revokePassFromLog(detailsLog.visitorLogID);

            const [updatedActive, updatedEntries] = await Promise.all([
                getActiveLogs(),
                getAllLogEntries(),
            ]);
            setActiveLogs(updatedActive);
            setLogEntries(updatedEntries);

            const updatedLog = updatedActive.find(
                (l) => l.visitorLogID === detailsLog.visitorLogID
            );
            if (updatedLog) {
                setDetailsLog(updatedLog);
            }

            const entriesForLog = updatedEntries.filter(
                (e: any) => e.visitorLogId === detailsLog.visitorLogID
            );
            setDetailsEntries(entriesForLog);

            setDetailsPassCode("");
            setDetailsPassInternalId(null);
            setDetailsRfidStatus("Pass revoked successfully.");
        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Failed to revoke pass.", {
                variant: "error",
            });
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleRevokePass = () => {
        if (!detailsLog) return;

        setConfirmState({
            open: true,
            title: "Revoke Pass",
            message: `Revoke pass for ${detailsLog.fullName}? This will unlink the pass but keep the visitor checked in.`,
            confirmLabel: "Revoke",
            cancelLabel: "Cancel",
            onConfirm: revokePassNow,
        });
    };

    const openIncidentModal = () => {
        if (!detailsLog || !detailsVisitor) {
            showToast("No active visitor log selected.", { variant: "warning" });
            return;
        }

        if (
            !detailsLog.passNo ||
            detailsLog.passNo === "—" ||
            detailsLog.passNo === "-"
        ) {
            showToast("This visitor currently has no assigned pass.", {
                variant: "warning",
            });
            return;
        }

        setIncidentType("LOST");
        setIncidentDescription("");
        setIncidentOpen(true);
    };

    const handleReportIncident = async () => {
        if (!detailsLog || !detailsVisitor) return;

        if (
            !detailsLog.passNo ||
            detailsLog.passNo === "—" ||
            detailsLog.passNo === "-"
        ) {
            showToast("This visitor currently has no assigned pass.", {
                variant: "warning",
            });
            return;
        }

        // Try to resolve pass from the in-memory passes list
        const code = detailsLog.passNo.trim();

        const pass = passes.find(
            (p) =>
                p.displayCode === code ||
                p.passNumber === code ||
                String(p.passID) === code
        );

        if (!pass) {
            showToast(
                `Could not resolve the pass record for code "${detailsLog.passNo}".`,
                { variant: "error" }
            );
            return;
        }

        try {
            setDetailsLoading(true);

            await reportPassIncident({
                passId: pass.passID,
                visitorId: detailsVisitor.visitorID,
                visitorLogId: detailsLog.visitorLogID,
                stationId: currentStationId ?? undefined,
                guardAccountId: currentUserId ?? undefined,
                incidentType: incidentType || "LOST",
                description: incidentDescription || undefined,
            });

            showToast(
                "Incident recorded. Admin can review it in the incident list / reports.",
                { variant: "success" }
            );

            setIncidentOpen(false);
        } catch (err: any) {
            console.error(err);
            showToast(
                err?.message || "Failed to report incident for this pass.",
                { variant: "error" }
            );
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleReadRfidForDetails = async () => {
        setPollingEnabled(false);
        setDetailsRfidStatus(null);
        setDetailsRfidLoading(true);

        try {
            const result = await readCardUID();
            if (!result.success || !result.uid) {
                setDetailsRfidStatus(
                    result.message || "No card detected. Please tap a card again."
                );
                setDetailsPassInternalId(null);
                return;
            }

            const uid = result.uid;
            setDetailsRfidStatus(`Card detected (UID: ${uid}). Looking up pass...`);

            let pass: VisitorPass | null = null;

            try {
                pass = await getPassByUid(uid);
            } catch (err: any) {
                console.error("Online pass lookup failed (details), trying offline cache:", err);
                pass = findPassOfflineByUid(uid);
            }

            if (!pass) {
                setDetailsRfidStatus(
                    `No usable Visitor Pass is linked to UID ${uid}. ` +
                    `Please register it first or enter a pass code manually.`
                );
                setDetailsPassInternalId(null);
                return;
            }

            setDetailsPassInternalId(pass.passID);

            const label =
                (pass as any).displayCode ??
                (pass as any).passNumber ??
                String(pass.passID);

            setDetailsPassCode(label);
            setDetailsRfidStatus(`Linked to pass: ${label}`);
        } catch (err: any) {
            console.error("RFID read error (details):", err);
            setDetailsRfidStatus(err?.message || "Failed to read RFID card.");
            setDetailsPassInternalId(null);
        } finally {
            setDetailsRfidLoading(false);
            setPollingEnabled(true);
        }
    };

    // periodic lightweight refresh while on this page
    useEffect(() => {
        const REFRESH_INTERVAL_MS = 30_000; // 30s; adjust if needed

        let cancelled = false;

        const refreshData = async () => {
            if (!navigator.onLine) return;
            if (cancelled) return;

            try {
                const [activeLogsData, entriesData, passesData] = await Promise.all([
                    getActiveLogs(),
                    getAllLogEntries(),
                    getAllPasses(),
                ]);

                if (cancelled) return;

                setActiveLogs(activeLogsData);
                setLogEntries(entriesData);
                setPasses(passesData);
            } catch (err) {
                console.error("Failed to refresh log visitor data", err);
            }
        };

        const intervalId = window.setInterval(refreshData, REFRESH_INTERVAL_MS);

        // optional: one immediate refresh shortly after mount, without waiting 30s
        // refreshData();

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, []);

    if (loading) {
        return (
            <DashboardLayout>
                <p className="text-gray-400 text-center mt-8">
                    Loading visitors and logs...
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
            <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-xl">Log Visitor</p>
                    <div className="flex items-center gap-2">
                        <Input
                            className="text-dark-gray"
                            placeholder="Search by name, ID, location, pass..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(0);
                            }}
                        />
                    </div>
                    {/* Filters row */}
                    <div className="flex flex-wrap gap-3 text-sm">
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

                        {/* Entry via (first location) filter */}
                        <div className="flex items-center gap-1">
                            <span className="text-slate-300">Entry via:</span>
                            <select
                                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs"
                                value={entryFilter}
                                onChange={(e) => {
                                    setEntryFilter(e.target.value);
                                    setPage(0);
                                }}
                            >
                                <option value="all">All</option>
                                {entryLocationOptions.map((loc) => (
                                    <option key={loc} value={loc}>
                                        {loc}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Visitor type filter */}
                    <div className="flex items-center gap-1">
                        <span className="text-slate-300">Visitor type:</span>
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
            </div>
            <Table>
                <Thead>
                    <Tr>
                        <Th>ID #</Th>
                        <Th>Full Name</Th>
                        <Th>Visitor Type</Th>
                        <Th>ID Type</Th>
                        <Th>Status</Th>
                        <Th>First Location</Th>
                        <Th>Last Location</Th>
                        <Th>Pass No</Th>
                        <Th>Actions</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {pagedVisitors.map((v) => {
                        const log = getActiveLogForVisitor(v.visitorID);
                        const status = log ? "Active" : "Inactive";
                        const firstLocation = log?.firstLocation ?? "—";
                        const lastLocation = log?.location ?? "—";
                        const passNo = log?.passNo ?? "—";
                        const normalizedVisitorType = normalizeVisitorType(v.visitorType);

                        return (
                            <Tr key={v.visitorID}>
                                <Td>{v.idNumber}</Td>
                                <Td>{v.visitorName}</Td>
                                <Td>{normalizedVisitorType || "N/A"}</Td>
                                <Td>{v.idType}</Td>
                                <Td>
                                    <span
                                        className={
                                            status === "Active" ? "text-green-400" : "text-red-400"
                                        }
                                    >
                                        {status}
                                    </span>
                                </Td>
                                <Td>{firstLocation}</Td>
                                <Td>{lastLocation}</Td>
                                <Td>{passNo}</Td>
                                <Td className="py-2">
                                    <div className="flex gap-2">
                                        <Button
                                            variation="secondary"
                                            className="text-xs px-2 py-1"
                                            onClick={() => openProfile(v)}
                                        >
                                            Profile
                                        </Button>

                                        {log ? (
                                            // If there’s an active log -> everyone can "Check Log"
                                            <Button
                                                className="text-xs px-2 py-1"
                                                onClick={() => openDetails(v, log)}
                                            >
                                                Check Log
                                            </Button>
                                        ) : isGateStation ? (
                                            // Only stations whose name contains "Gate" can start a log
                                            <Button
                                                className="text-xs px-2 py-1"
                                                onClick={() => openStartLog(v)}
                                            >
                                                Start Log
                                            </Button>
                                        ) : (
                                            // Building guards / unknown station: no Start Log button
                                            <Button
                                                variation="outlined"
                                                className="text-xs px-2 py-1"
                                                disabled
                                            >
                                                No Logs
                                            </Button>
                                        )}
                                    </div>
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
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
            />

            <VisitorProfileModal
                isOpen={profileOpen}
                visitor={profileVisitor}
                onClose={closeProfile}
            />
            <StartLogModal
                isOpen={startModalOpen}
                visitor={startVisitor}
                stations={stations}
                startPurpose={startPurpose}
                onStartPurposeChange={setStartPurpose}
                startPassId={startPassId}
                onStartPassIdChange={setStartPassId}
                startAllowedStationIds={startAllowedStationIds}
                onToggleAllowedStation={toggleAllowedStation}
                rfidStatus={rfidStatus}
                rfidLoading={rfidLoading}
                onReadRfid={handleReadRfid}
                onClose={closeStartModal}
                onSubmit={handleStartLog}
            />
            <LogDetailsModal
                isOpen={detailsOpen}
                onClose={closeDetails}
                visitor={detailsVisitor}
                log={detailsLog}
                entries={detailsEntries}
                detailsLoading={detailsLoading}
                hasStationContext={!!(currentStationId && currentStation)}
                isGateStation={isGateStation}
                showBuildingPassControls={showBuildingPassControls}
                detailsPassCode={detailsPassCode}
                detailsRfidStatus={detailsRfidStatus}
                detailsRfidLoading={detailsRfidLoading}
                onChangePassCode={setDetailsPassCode}
                onReadRfidForDetails={handleReadRfidForDetails}
                onGrantPass={handleGrantPass}
                onRevokePass={handleRevokePass}
                onReportIncidentClick={openIncidentModal}
                onEndLog={handleEndLog}
                onLogHere={handleCheckInHere}
            />
            <IncidentReportModal
                isOpen={incidentOpen}
                onClose={() => setIncidentOpen(false)}
                visitor={detailsVisitor}
                log={detailsLog}
                incidentType={incidentType}
                incidentDescription={incidentDescription}
                loading={detailsLoading}
                onIncidentTypeChange={setIncidentType}
                onIncidentDescriptionChange={setIncidentDescription}
                onSubmit={handleReportIncident}
            />
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
