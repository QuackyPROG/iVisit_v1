// src/layouts/DashboardLayout.tsx
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import iVisitLogo from "../assets/images/logo.png";
import dashboardRoutes from "../routes/DashboardRoutes";
import ActivityLog from "../components/fragments/ActivityLog";
import { useCookies } from "react-cookie";
import { getStationById, type Station } from "../api/StationsApi";
import Button from '../components/common/Button';
import { processQueueOnce } from "../offline/operationQueue";
import { useOfflineQueueSync } from "../hooks/useOfflineQueueSynch";
import RfidTapListener from "../features/rfid/RfidTapListener";
import HelperStatusBadge from "../components/fragments/HelperStatusBadge";

type Role = "guard" | "admin" | "support";

export default function DashboardLayout({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const location = useLocation();

  const [cookies, , removeCookie] = useCookies([
    "role",
    "username",
    "stationId",
  ]);

  const cookieRoleRaw = (cookies.role as string | undefined)?.toLowerCase();

  const safeRole: Role =
    cookieRoleRaw === "guard" ||
      cookieRoleRaw === "admin" ||
      cookieRoleRaw === "support"
      ? cookieRoleRaw
      : "guard";

  const username = (cookies.username as string | undefined) ?? "";
  const rawStationId = cookies.stationId;
  const stationId =
    typeof rawStationId === "number"
      ? rawStationId
      : rawStationId != null
        ? Number.parseInt(String(rawStationId), 10)
        : null;

  const [stationName, setStationName] = useState<string | null>(null);
  const [stationType, setStationType] = useState<string | null>(null);
  const [stationLoading, setStationLoading] = useState(false);
  const [stationError, setStationError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [rightMobileOpen, setRightMobileOpen] = useState(false);

  // Offline queue sync
  useOfflineQueueSync();

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (cancelled) return;
      await processQueueOnce();
    }

    tick(); // run once at mount
    const id = setInterval(tick, 30000); // every 30s

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Fetch station name for GUARD users, if we have a stationId
  useEffect(() => {
    if (safeRole !== "guard") {
      setStationName(null);
      setStationType(null);
      setStationError(null);
      setStationLoading(false);
      return;
    }

    if (rawStationId == null) {
      setStationName(null);
      setStationType(null);
      setStationError("No station linked to this device.");
      setStationLoading(false);
      return;
    }

    const parsedId =
      typeof rawStationId === "number"
        ? rawStationId
        : Number.parseInt(String(rawStationId), 10);

    if (Number.isNaN(parsedId)) {
      setStationName(null);
      setStationError("Invalid station ID.");
      setStationLoading(false);
      return;
    }

    let cancelled = false;
    setStationLoading(true);
    setStationError(null);

    (async () => {
      try {
        const station: Station = await getStationById(parsedId);
        if (!cancelled) {
          setStationName(station.name ?? `Station #${parsedId}`);
          setStationType((station as any).stationType ?? null); // or station.stationType if typed
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("Failed to load station info:", err);
          setStationName(null);
          setStationError("Unable to load station information.");
        }
      } finally {
        if (!cancelled) {
          setStationLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [safeRole, rawStationId]);

  const handleSignOut = () => {
    // Clear cookies (must use same path as when they were set)
    removeCookie("role", { path: "/" });
    removeCookie("username", { path: "/" });
    removeCookie("stationId", { path: "/" });

    // Hard redirect – makes back navigation less useful
    window.location.href = "/sign-in";
  };

  return (
    <div className={`flex h-dvh bg-[url(/background.png)] bg-no-repeat bg-cover ${className}`}>
      <div className="flex w-full m-2 lg:m-14 rounded-2xl overflow-hidden bg-white/10 border border-white/30 backdrop-blur-lg shadow-lg">
        {/* LEFT SIDEBAR */}
        <aside className="hidden lg:flex w-60 bg-dark-gray/70 border-r border-white/30 flex-col min-h-0">
          <div className="p-4 border-b border-white/30 flex items-center gap-2">
            <img src={iVisitLogo} alt="iVisit logo" className="w-10" />
            <div>
              <p className="text-xl font-semibold text-white">iVisit</p>
              <p className="text-white">User Management Portal</p>
            </div>
          </div>

          <nav className="flex-1 flex flex-col p-2 gap-1 overflow-y-auto custom-scrollbar">
            {dashboardRoutes
              ?.filter((e) => {
                if (!e.type.includes(safeRole)) return false;

                // Extra rule: only gate guards see Scan Id
                if (e.path === "/dashboard/scan-id" && safeRole === "guard") {
                  const type = (stationType || "").toUpperCase();
                  const isGateStationExplicit = type === "GATE";

                  const name = (stationName || "").toLowerCase();
                  const looksLikeGateByName = name.includes("gate");

                  const isGate = isGateStationExplicit || looksLikeGateByName;
                  if (!isGate) return false;
                }

                return true;
              })
              .map((e) => {
                const isActive = location.pathname === e.path;
                return (
                  <Link
                    key={e.path}
                    to={e.path}
                    className={`block rounded-lg px-4 py-2 text-sm font-medium transition-colors
            ${isActive
                        ? "bg-yellow-600 text-white"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    {e.label}
                  </Link>
                );
              })}
          </nav>
          <div className="flex flex-col p-4">
            <Button
              onClick={handleSignOut}
              variation="outlined"
              className="mt-auto transition-colors hover:bg-yellow-600"
            >
              Sign out
            </Button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-6 flex flex-col text-white min-w-0 min-h-0 overflow-y-auto custom-scrollbar">
          <div className="lg:hidden mb-4 flex items-center justify-between gap-2">
            <button aria-label="Open menu" onClick={() => setMobileOpen(true)} className="p-2 rounded-md bg-white/5">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <button aria-label="Open activity" onClick={() => setRightMobileOpen(true)} className="p-2 rounded-md bg-white/5">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.644 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          {children}
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="hidden lg:flex flex-col w-60 border-l p-4 border-white/30 bg-dark-gray/70 min-h-0 overflow-y-auto custom-scrollbar">
          <div className="grid gap-4 grid-cols-[auto_1fr] items-center p-3 h-fit rounded-md border border-white/30">
            <img
              className="rounded-full aspect-square w-12"
              src={iVisitLogo}
              alt="avatar"
            />
            <div className="min-w-0">
              <h1 className="text-white truncate">
                {username || "User"}
              </h1>
              <p className="text-white text-xs">
                {safeRole
                  ? safeRole.charAt(0).toUpperCase() + safeRole.slice(1)
                  : ""}
              </p>

              {/* Station info only for guards */}
              {safeRole === "guard" && (
                <div className="mt-2 text-xs text-white/80">
                  {stationLoading && <span>Loading station…</span>}
                  {!stationLoading && stationError && (
                    <span className="text-red-300">{stationError}</span>
                  )}
                  {!stationLoading && !stationError && stationName && (
                    <span>Station: {stationName}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Helper / RFID badge */}
          {safeRole === "guard" && (
            <div className="mb-3">
              <HelperStatusBadge />
            </div>
          )}

          <ActivityLog />
        </aside>

        {mobileOpen && (
          <div>
            <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-50 w-64 bg-dark-gray/90 border-r border-white/30 p-4 flex flex-col overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <img src={iVisitLogo} alt="iVisit" className="w-8" />
                  <div>
                    <p className="text-white font-semibold">iVisit</p>
                    <p className="text-xs text-white/70">User Portal</p>
                  </div>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-2 rounded-md bg-white/5">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <nav className="flex-1 flex flex-col gap-2 overflow-y-auto">
                {dashboardRoutes
                  ?.filter((e) => {
                    if (!e.type.includes(safeRole)) return false;

                    if (e.path === "/dashboard/scan-id" && safeRole === "guard") {
                      const type = (stationType || "").toUpperCase();
                      const isGateStationExplicit = type === "GATE";

                      const name = (stationName || "").toLowerCase();
                      const looksLikeGateByName = name.includes("gate");

                      const isGate = isGateStationExplicit || looksLikeGateByName;
                      if (!isGate) return false;
                    }

                    return true;
                  })
                  .map((e) => {
                    const isActive = location.pathname === e.path;
                    return (
                      <Link
                        key={e.path}
                        to={e.path}
                        className={`block rounded-lg px-4 py-2 text-sm font-medium transition-colors
                          ${isActive
                            ? "bg-yellow-600 text-white"
                            : "text-white/80 hover:bg-white/10 hover:text-white"
                          }`}
                      >
                        {e.label}
                      </Link>
                    );
                  })}
              </nav>
              <div className="flex flex-col mt-4">
                <Button
                  onClick={handleSignOut}
                  variation="outlined"
                  className="mt-auto transition-colors hover:bg-yellow-600"
                >
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        )}

        {rightMobileOpen && (
          <div>
            <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setRightMobileOpen(false)} />
            <div className="fixed flex flex-col inset-y-0 right-0 z-50 w-64 bg-dark-gray/90 border-l border-white/30 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <img src={iVisitLogo} alt="iVisit" className="w-8" />
                  <div>
                    <p className="text-white font-semibold">iVisit</p>
                    <p className="text-xs text-white/70">User Portal</p>
                  </div>
                </div>
                <button onClick={() => setRightMobileOpen(false)} className="p-2 rounded-md bg-white/5">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid gap-4 grid-cols-[auto_1fr] items-center p-3 h-fit rounded-md border border-white/30">
                <img
                  className="rounded-full aspect-square w-12"
                  src={iVisitLogo}
                  alt="avatar"
                />
                <div className="min-w-0">
                  <h1 className="text-white truncate">
                    {username || "User"}
                  </h1>
                  <p className="text-white text-xs">
                    {safeRole
                      ? safeRole.charAt(0).toUpperCase() + safeRole.slice(1)
                      : ""}
                  </p>

                  {/* Station info only for guards */}
                  {safeRole === "guard" && (
                    <div className="mt-2 text-xs text-white/80">
                      {stationLoading && <span>Loading station…</span>}
                      {!stationLoading && stationError && (
                        <span className="text-red-300">{stationError}</span>
                      )}
                      {!stationLoading && !stationError && stationName && (
                        <span>Station: {stationName}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Helper / RFID badge */}
              {safeRole === "guard" && (
                <div className="mb-3">
                  <HelperStatusBadge />
                </div>
              )}

              <ActivityLog />
            </div>
          </div>
        )}

        {/* RFID tapper – always mounted in dashboard, guards only */}
        <RfidTapListener
          role={safeRole}
          stationId={stationId}
          stationName={stationName}
          stationType={stationType}
        />
      </div>
    </div>
  );
}
