// src/utils/exportVisitorsPdf.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Visitor } from "../api/VisitorsApi";
import type {
  VisitorLogDTO,
  VisitorLogEntryDTO,
} from "../api/VisitorLogsApi";

export function exportVisitorsPdf(
  visitors: Visitor[],
  allLogs: VisitorLogDTO[],
  activeLogs: VisitorLogDTO[],
  allEntries: VisitorLogEntryDTO[]
) {
  if (!visitors.length) return;

  const doc = new jsPDF("l", "mm", "a4");

  // ---------- Title & meta ----------
  doc.setFontSize(14);
  doc.text("iVisit Visitor Archive Report", 14, 16);

  const generatedAt = new Date().toISOString().slice(0, 19).replace("T", " ");
  doc.setFontSize(10);
  doc.text(`Generated at: ${generatedAt}`, 14, 22);

  // ---------- Sets for linking ----------
  const visitorNameSet = new Set(
    visitors
      .map((v) => v.visitorName?.toLowerCase())
      .filter((n): n is string => !!n)
  );

  const activeNameSet = new Set(
    activeLogs
      .map((l) => l.fullName?.toLowerCase())
      .filter((n): n is string => !!n)
  );

  const logsForVisitors = allLogs.filter(
    (log) =>
      log.fullName && visitorNameSet.has(log.fullName.toLowerCase())
  );

  const activeLogIdSet = new Set(
    activeLogs
      .map((l) => l.visitorLogID)
      .filter((id): id is number => id != null)
  );

  const logIdSet = new Set(
    logsForVisitors
      .map((l) => l.visitorLogID)
      .filter((id): id is number => id != null)
  );

  const entriesForVisitors = allEntries.filter(
    (e) => e.visitorLogId != null && logIdSet.has(e.visitorLogId)
  );

  const getLastY = () =>
    (doc as any).lastAutoTable?.finalY
      ? (doc as any).lastAutoTable.finalY
      : 28;

  // ---------- Section 1: Visitors ----------
  const visitorHead = [
    "Visitor ID",
    "Full Name",
    "Visitor Type",
    "ID Type",
    "ID Number",
    "Date of Birth",
    "Status",
    "Registered At",
  ];

  const visitorBody = visitors.map((v) => {
    const name = v.visitorName ?? "";
    const isActive = name
      ? activeNameSet.has(name.toLowerCase())
      : false;

    return [
      String(v.visitorID),
      name,
      v.visitorType ?? "",
      v.idType ?? "",
      v.idNumber ?? "",
      v.dateOfBirth ?? "",
      isActive ? "Active" : "Inactive",
      v.createdAt ?? "",
    ];
  });

  doc.setFontSize(12);
  doc.text("Visitors", 14, 28);

  autoTable(doc, {
    startY: 32,
    head: [visitorHead],
    body: visitorBody,
    styles: { fontSize: 8 },
    headStyles: { fillColor: undefined },
  });

  // ---------- Section 2: Visitor Logs ----------
  if (logsForVisitors.length > 0) {
    let startY = getLastY() + 8;
    if (startY > 190) {
      doc.addPage();
      startY = 20;
    }

    doc.setFontSize(12);
    doc.text("Visitor Logs", 14, startY);

    const logHead = [
      "Log ID",
      "Full Name",
      "ID Type",
      "Pass No",
      "First Location",
      "Last Location",
      "Purpose",
      "Logged By",
      "Date",
      "Time",
      "Status",
    ];

    const logBody = logsForVisitors.map((log) => {
      const status = activeLogIdSet.has(log.visitorLogID)
        ? "Active"
        : "Inactive";

      return [
        String(log.visitorLogID ?? ""),
        log.fullName ?? "",
        log.idType ?? "",
        log.passNo ?? "",
        log.firstLocation ?? "",
        log.location ?? "",
        log.purposeOfVisit ?? "",
        log.loggedBy ?? "",
        log.date ?? "",
        log.time ?? "",
        status,
      ];
    });

    autoTable(doc, {
      startY: startY + 4,
      head: [logHead],
      body: logBody,
      styles: { fontSize: 7 },
      headStyles: { fillColor: undefined },
    });
  }

  // ---------- Section 3: Visitor Log Entries ----------
  if (entriesForVisitors.length > 0) {
    let startY = getLastY() + 8;
    if (startY > 190) {
      doc.addPage();
      startY = 20;
    }

    doc.setFontSize(12);
    doc.text("Visitor Log Entries", 14, startY);

    const entryHead = [
      "Entry ID",
      "Visitor Log ID",
      "Visitor Name",
      "Visitor Type",
      "Station",
      "Guard",
      "Pass No",
      "Timestamp",
    ];

    const entryBody = entriesForVisitors.map((e) => [
      String(e.entryId ?? ""),
      e.visitorLogId != null ? String(e.visitorLogId) : "",
      e.visitorName ?? "",
      e.visitorType ?? "",
      e.stationName ?? "",
      e.guardName ?? "",
      e.passNo ?? "",
      e.timestamp ?? "",
    ]);

    autoTable(doc, {
      startY: startY + 4,
      head: [entryHead],
      body: entryBody,
      styles: { fontSize: 7 },
      headStyles: { fillColor: undefined },
    });
  }

  const dateStamp = new Date().toISOString().slice(0, 10);
  doc.save(`visitors-report-${dateStamp}.pdf`);
}
