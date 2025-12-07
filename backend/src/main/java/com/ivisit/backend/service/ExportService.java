package com.ivisit.backend.service;

import com.ivisit.backend.model.Visitor;
import com.ivisit.backend.model.VisitorLog;
import com.ivisit.backend.model.VisitorLogEntry;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ExportService {

    // ---------- CSV builders (used by ArchiveCenter + Visitors exports) ----------

    public byte[] buildVisitorsCsv(List<Visitor> visitors) {
        List<String> lines = new ArrayList<>();
        lines.add("visitorID,visitorName,visitorType,gender,idType,idNumber,dateOfBirth,createdAt,archived,archivedAt");

        if (visitors != null) {
            for (Visitor v : visitors) {
                if (v == null) continue;

                String visitorId = v.getVisitorID() != null ? v.getVisitorID().toString() : "";
                String name = escapeCsv(v.getVisitorName());
                String type = escapeCsv(v.getVisitorType());
                String gender = escapeCsv(v.getGender());
                String idType = escapeCsv(v.getIdType());
                String idNumber = escapeCsv(v.getIdNumber());
                String dob = v.getDateOfBirth() != null ? escapeCsv(v.getDateOfBirth().toString()) : "";
                String createdAt = v.getCreatedAt() != null ? escapeCsv(v.getCreatedAt().toString()) : "";
                String archived = v.getArchived() != null && v.getArchived() ? "true" : "false";
                String archivedAt = v.getArchivedAt() != null ? escapeCsv(v.getArchivedAt().toString()) : "";

                String line = String.join(",",
                        visitorId,
                        name,
                        type,
                        gender,
                        idType,
                        idNumber,
                        dob,
                        createdAt,
                        archived,
                        archivedAt
                );
                lines.add(line);
            }
        }

        String csv = String.join("\n", lines);
        return csv.getBytes(StandardCharsets.UTF_8);
    }

    public byte[] buildLogsCsv(List<VisitorLog> logs) {
        List<String> lines = new ArrayList<>();
        lines.add("visitorLogID,visitorID,purposeOfVisit,passLabel,activeStart,activeEnd,firstLocation,lastLocation,archived,archivedAt");

        if (logs != null) {
            for (VisitorLog log : logs) {
                if (log == null) continue;

                Long visitorId = log.getVisitor() != null ? log.getVisitor().getVisitorID() : null;

                String passLabel = "-";
                if (log.getVisitorPass() != null) {
                    if (log.getVisitorPass().getDisplayCode() != null &&
                            !log.getVisitorPass().getDisplayCode().trim().isEmpty()) {
                        passLabel = log.getVisitorPass().getDisplayCode();
                    } else if (log.getVisitorPass().getPassNumber() != null &&
                            !log.getVisitorPass().getPassNumber().trim().isEmpty()) {
                        passLabel = log.getVisitorPass().getPassNumber();
                    } else if (log.getVisitorPass().getPassID() != null) {
                        passLabel = "P-" + log.getVisitorPass().getPassID();
                    }
                }

                String firstLocation = "N/A";
                String lastLocation = "N/A";

                List<VisitorLogEntry> entries = log.getVisitorLogEntries();
                if (entries != null && !entries.isEmpty()) {
                    List<VisitorLogEntry> sorted = new ArrayList<>(entries);
                    sorted.sort(Comparator.comparing(VisitorLogEntry::getTimestamp));

                    VisitorLogEntry first = sorted.get(0);
                    VisitorLogEntry last = sorted.get(sorted.size() - 1);

                    if (first.getStation() != null && first.getStation().getName() != null) {
                        firstLocation = first.getStation().getName();
                    }
                    if (last.getStation() != null && last.getStation().getName() != null) {
                        lastLocation = last.getStation().getName();
                    }
                }

                String activeStart = log.getActiveStart() != null ? escapeCsv(log.getActiveStart().toString()) : "";
                String activeEnd = log.getActiveEnd() != null ? escapeCsv(log.getActiveEnd().toString()) : "";
                String purpose = log.getPurposeOfVisit() != null ? escapeCsv(log.getPurposeOfVisit()) : "";
                String archived = log.getArchived() != null && log.getArchived() ? "true" : "false";
                String archivedAt = log.getArchivedAt() != null ? escapeCsv(log.getArchivedAt().toString()) : "";

                String line = String.join(",",
                        log.getVisitorLogID() != null ? log.getVisitorLogID().toString() : "",
                        visitorId != null ? visitorId.toString() : "",
                        purpose,
                        escapeCsv(passLabel),
                        activeStart,
                        activeEnd,
                        escapeCsv(firstLocation),
                        escapeCsv(lastLocation),
                        archived,
                        archivedAt
                );
                lines.add(line);
            }
        }

        String csv = String.join("\n", lines);
        return csv.getBytes(StandardCharsets.UTF_8);
    }

    public byte[] buildEntriesCsv(List<VisitorLogEntry> entries) {
        List<String> lines = new ArrayList<>();
        lines.add("visitorLogEntryID,visitorLogID,stationName,guardName,passLabel,timestamp,archived,archivedAt");

        if (entries != null) {
            for (VisitorLogEntry e : entries) {
                if (e == null) continue;

                VisitorLog log = e.getVisitorLog();
                Long logId = log != null ? log.getVisitorLogID() : null;

                String stationName = (e.getStation() != null && e.getStation().getName() != null)
                        ? e.getStation().getName()
                        : "Unknown station";

                String guardName = (e.getUserAccount() != null && e.getUserAccount().getUsername() != null)
                        ? e.getUserAccount().getUsername()
                        : "System";

                String passLabel = "-";
                if (log != null && log.getVisitorPass() != null) {
                    if (log.getVisitorPass().getDisplayCode() != null &&
                            !log.getVisitorPass().getDisplayCode().trim().isEmpty()) {
                        passLabel = log.getVisitorPass().getDisplayCode();
                    } else if (log.getVisitorPass().getPassNumber() != null &&
                            !log.getVisitorPass().getPassNumber().trim().isEmpty()) {
                        passLabel = log.getVisitorPass().getPassNumber();
                    } else if (log.getVisitorPass().getPassID() != null) {
                        passLabel = "P-" + log.getVisitorPass().getPassID();
                    }
                }

                String ts = e.getTimestamp() != null ? escapeCsv(e.getTimestamp().toString()) : "";
                String archived = e.getArchived() != null && e.getArchived() ? "true" : "false";
                String archivedAt = e.getArchivedAt() != null ? escapeCsv(e.getArchivedAt().toString()) : "";

                String line = String.join(",",
                        e.getVisitorLogEntryID() != null ? e.getVisitorLogEntryID().toString() : "",
                        logId != null ? logId.toString() : "",
                        escapeCsv(stationName),
                        escapeCsv(guardName),
                        escapeCsv(passLabel),
                        ts,
                        archived,
                        archivedAt
                );
                lines.add(line);
            }
        }

        String csv = String.join("\n", lines);
        return csv.getBytes(StandardCharsets.UTF_8);
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        boolean needsQuotes = value.contains(",") || value.contains("\"") || value.contains("\n");
        String escaped = value.replace("\"", "\"\"");
        return needsQuotes ? "\"" + escaped + "\"" : escaped;
    }

    // ---------- Archive report PDF (ArchiveCenter) ----------

    public byte[] buildArchiveReportPdf(
            List<Visitor> visitors,
            List<VisitorLog> logs,
            List<VisitorLogEntry> entries,
            LocalDate fromDate,
            LocalDate toDate
    ) throws DocumentException {

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4.rotate(), 36, 36, 48, 36);
        PdfWriter.getInstance(doc, baos);

        try {
            doc.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
            Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 9);

            Paragraph title = new Paragraph("iVisit Archive Report", titleFont);
            title.setSpacingAfter(8f);
            doc.add(title);

            String rangeLabel;
            if (fromDate == null && toDate == null) {
                rangeLabel = "Range: all archived records";
            } else if (fromDate != null && toDate == null) {
                rangeLabel = "Range: from " + fromDate;
            } else if (fromDate == null) {
                rangeLabel = "Range: until " + toDate;
            } else if (fromDate.equals(toDate)) {
                rangeLabel = "Range: " + fromDate;
            } else {
                rangeLabel = "Range: " + fromDate + " to " + toDate;
            }

            String generatedAt = Timestamp.from(Instant.now()).toString();

            Paragraph meta = new Paragraph(
                    rangeLabel + "    " +
                            "Visitors: " + safeSize(visitors) + "    " +
                            "Logs: " + safeSize(logs) + "    " +
                            "Entries: " + safeSize(entries) + "    " +
                            "Generated at: " + generatedAt,
                    smallFont
            );
            meta.setSpacingAfter(6f);
            doc.add(meta);

            // Summary block (statistics-like)
            Paragraph summaryHeader = new Paragraph("Summary", sectionFont);
            summaryHeader.setSpacingBefore(4f);
            summaryHeader.setSpacingAfter(2f);
            doc.add(summaryHeader);

            Paragraph summary = new Paragraph("", smallFont);
            summary.add("• Total visitors in this report: " + safeSize(visitors) + "\n");
            summary.add("• Total logs in this report: " + safeSize(logs) + "\n");
            summary.add("• Total entries in this report: " + safeSize(entries) + "\n");
            summary.setSpacingAfter(10f);
            doc.add(summary);

            // Visitors table
            if (visitors != null && !visitors.isEmpty()) {
                Paragraph header = new Paragraph("Visitors", sectionFont);
                header.setSpacingBefore(4f);
                header.setSpacingAfter(4f);
                doc.add(header);

                PdfPTable table = new PdfPTable(8);
                table.setWidthPercentage(100f);
                table.setWidths(new float[]{8f, 20f, 16f, 10f, 12f, 12f, 10f, 12f});

                addHeaderCell(table, "ID");
                addHeaderCell(table, "Full Name");
                addHeaderCell(table, "Visitor Type");
                addHeaderCell(table, "Gender");
                addHeaderCell(table, "ID Type");
                addHeaderCell(table, "ID Number");
                addHeaderCell(table, "Birthdate");
                addHeaderCell(table, "Registered At");

                for (Visitor v : visitors) {
                    if (v == null) continue;
                    addBodyCell(table, v.getVisitorID() != null ? v.getVisitorID().toString() : "-");
                    addBodyCell(table, nz(v.getVisitorName()));
                    addBodyCell(table, nz(v.getVisitorType()));
                    addBodyCell(table, nz(v.getIdType()));
                    addBodyCell(table, nz(v.getGender()));
                    addBodyCell(table, nz(v.getIdNumber()));
                    addBodyCell(table, v.getDateOfBirth() != null ? v.getDateOfBirth().toString() : "-");
                    addBodyCell(table, v.getCreatedAt() != null ? v.getCreatedAt().toString() : "-");
                }

                doc.add(table);
            } else {
                Paragraph p = new Paragraph("No visitors archived in this range.", smallFont);
                p.setSpacingAfter(8f);
                doc.add(p);
            }

            // Logs table
            if (logs != null && !logs.isEmpty()) {
                Paragraph header = new Paragraph("Visitor Logs", sectionFont);
                header.setSpacingBefore(12f);
                header.setSpacingAfter(4f);
                doc.add(header);

                PdfPTable table = new PdfPTable(8);
                table.setWidthPercentage(100f);
                table.setWidths(new float[]{6f, 8f, 18f, 10f, 13f, 13f, 16f, 16f});

                addHeaderCell(table, "Log ID");
                addHeaderCell(table, "Visitor ID");
                addHeaderCell(table, "Purpose");
                addHeaderCell(table, "Pass");
                addHeaderCell(table, "Start");
                addHeaderCell(table, "End");
                addHeaderCell(table, "First Location");
                addHeaderCell(table, "Last Location");

                for (VisitorLog log : logs) {
                    if (log == null) continue;

                    String passLabel = "-";
                    if (log.getVisitorPass() != null) {
                        if (log.getVisitorPass().getDisplayCode() != null &&
                                !log.getVisitorPass().getDisplayCode().trim().isEmpty()) {
                            passLabel = log.getVisitorPass().getDisplayCode();
                        } else if (log.getVisitorPass().getPassNumber() != null &&
                                !log.getVisitorPass().getPassNumber().trim().isEmpty()) {
                            passLabel = log.getVisitorPass().getPassNumber();
                        } else if (log.getVisitorPass().getPassID() != null) {
                            passLabel = "P-" + log.getVisitorPass().getPassID();
                        }
                    }

                    String firstLocation = "N/A";
                    String lastLocation = "N/A";

                    List<VisitorLogEntry> entriesForLog = log.getVisitorLogEntries();
                    if (entriesForLog != null && !entriesForLog.isEmpty()) {
                        List<VisitorLogEntry> sorted = new ArrayList<>(entriesForLog);
                        sorted.sort(Comparator.comparing(VisitorLogEntry::getTimestamp));
                        VisitorLogEntry first = sorted.get(0);
                        VisitorLogEntry last = sorted.get(sorted.size() - 1);

                        if (first.getStation() != null && first.getStation().getName() != null) {
                            firstLocation = first.getStation().getName();
                        }
                        if (last.getStation() != null && last.getStation().getName() != null) {
                            lastLocation = last.getStation().getName();
                        }
                    }

                    addBodyCell(table, log.getVisitorLogID() != null ? log.getVisitorLogID().toString() : "-");
                    addBodyCell(table, log.getVisitor() != null && log.getVisitor().getVisitorID() != null
                            ? log.getVisitor().getVisitorID().toString()
                            : "-");
                    addBodyCell(table, nz(log.getPurposeOfVisit()));
                    addBodyCell(table, passLabel);
                    addBodyCell(table, log.getActiveStart() != null ? log.getActiveStart().toString() : "-");
                    addBodyCell(table, log.getActiveEnd() != null ? log.getActiveEnd().toString() : "-");
                    addBodyCell(table, firstLocation);
                    addBodyCell(table, lastLocation);
                }

                doc.add(table);
            }

            // Entries table
            if (entries != null && !entries.isEmpty()) {
                Paragraph header = new Paragraph("Visitor Log Entries", sectionFont);
                header.setSpacingBefore(12f);
                header.setSpacingAfter(4f);
                doc.add(header);

                PdfPTable table = new PdfPTable(6);
                table.setWidthPercentage(100f);
                table.setWidths(new float[]{6f, 8f, 20f, 18f, 12f, 18f});

                addHeaderCell(table, "Entry ID");
                addHeaderCell(table, "Log ID");
                addHeaderCell(table, "Station");
                addHeaderCell(table, "Guard");
                addHeaderCell(table, "Pass");
                addHeaderCell(table, "Timestamp");

                for (VisitorLogEntry e : entries) {
                    if (e == null) continue;

                    VisitorLog log = e.getVisitorLog();

                    String passLabel = "-";
                    if (log != null && log.getVisitorPass() != null) {
                        if (log.getVisitorPass().getDisplayCode() != null &&
                                !log.getVisitorPass().getDisplayCode().trim().isEmpty()) {
                            passLabel = log.getVisitorPass().getDisplayCode();
                        } else if (log.getVisitorPass().getPassNumber() != null &&
                                !log.getVisitorPass().getPassNumber().trim().isEmpty()) {
                            passLabel = log.getVisitorPass().getPassNumber();
                        } else if (log.getVisitorPass().getPassID() != null) {
                            passLabel = "P-" + log.getVisitorPass().getPassID();
                        }
                    }

                    addBodyCell(table, e.getVisitorLogEntryID() != null ? e.getVisitorLogEntryID().toString() : "-");
                    addBodyCell(table, log != null && log.getVisitorLogID() != null
                            ? log.getVisitorLogID().toString()
                            : "-");
                    addBodyCell(table,
                            e.getStation() != null && e.getStation().getName() != null
                                    ? e.getStation().getName()
                                    : "Unknown station"
                    );
                    addBodyCell(table,
                            e.getUserAccount() != null && e.getUserAccount().getUsername() != null
                                    ? e.getUserAccount().getUsername()
                                    : "System"
                    );
                    addBodyCell(table, passLabel);
                    addBodyCell(table, e.getTimestamp() != null ? e.getTimestamp().toString() : "-");
                }

                doc.add(table);
            }

        } finally {
            if (doc.isOpen()) {
                doc.close();
            }
        }

        return baos.toByteArray();
    }

    // ---------- Visitors selection PDF (Visitors page export, with stats) ----------

    public byte[] buildVisitorsSelectionPdf(
            List<Visitor> visitors,
            List<VisitorLog> logs,
            List<VisitorLogEntry> entries
    ) throws DocumentException {

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4.rotate(), 36, 36, 48, 36);
        PdfWriter.getInstance(doc, baos);

        try {
            doc.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
            Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 9);

            Paragraph title = new Paragraph("iVisit Visitors Export", titleFont);
            title.setSpacingAfter(8f);
            doc.add(title);

            String generatedAt = Timestamp.from(Instant.now()).toString();

            // Compute simple stats for "Statistics-like" header
            int totalVisitors = safeSize(visitors);

            Set<String> typeSet = new HashSet<>();
            LocalDate earliestRegistered = null;
            LocalDate latestRegistered = null;

            if (visitors != null) {
                for (Visitor v : visitors) {
                    if (v == null) continue;

                    if (v.getVisitorType() != null && !v.getVisitorType().trim().isEmpty()) {
                        typeSet.add(v.getVisitorType());
                    }

                    if (v.getCreatedAt() != null) {
                        LocalDate createdDate = v.getCreatedAt().toInstant()
                                .atZone(ZoneId.systemDefault())
                                .toLocalDate();

                        if (earliestRegistered == null || createdDate.isBefore(earliestRegistered)) {
                            earliestRegistered = createdDate;
                        }
                        if (latestRegistered == null || createdDate.isAfter(latestRegistered)) {
                            latestRegistered = createdDate;
                        }
                    }
                }
            }

            int uniqueTypes = typeSet.size();

            Paragraph meta = new Paragraph(
                    "Generated at: " + generatedAt,
                    smallFont
            );
            meta.setSpacingAfter(6f);
            doc.add(meta);

            Paragraph statsHeader = new Paragraph("Summary", sectionFont);
            statsHeader.setSpacingBefore(4f);
            statsHeader.setSpacingAfter(2f);
            doc.add(statsHeader);

            Paragraph stats = new Paragraph("", smallFont);
            stats.add("• Total visitors in this export: " + totalVisitors + "\n");
            stats.add("• Distinct visitor types: " + uniqueTypes + "\n");

            if (!typeSet.isEmpty()) {
                String typesJoined = typeSet.stream()
                        .sorted()
                        .collect(Collectors.joining(", "));
                stats.add("• Visitor types present: " + typesJoined + "\n");
            }

            stats.add("• First registration date: " +
                    (earliestRegistered != null ? earliestRegistered.toString() : "N/A") + "\n");
            stats.add("• Latest registration date: " +
                    (latestRegistered != null ? latestRegistered.toString() : "N/A") + "\n");

            stats.setSpacingAfter(10f);
            doc.add(stats);

            // Visitors table (similar to archive report visitors section)
            if (visitors != null && !visitors.isEmpty()) {
                Paragraph header = new Paragraph("Visitors", sectionFont);
                header.setSpacingBefore(4f);
                header.setSpacingAfter(4f);
                doc.add(header);

                PdfPTable table = new PdfPTable(8);
                table.setWidthPercentage(100f);
                table.setWidths(new float[]{8f, 20f, 16f, 10f, 12f, 12f, 10f, 12f});

                addHeaderCell(table, "ID");
                addHeaderCell(table, "Full Name");
                addHeaderCell(table, "Visitor Type");
                addHeaderCell(table, "Gender");
                addHeaderCell(table, "ID Type");
                addHeaderCell(table, "ID Number");
                addHeaderCell(table, "Birthdate");
                addHeaderCell(table, "Registered At");

                for (Visitor v : visitors) {
                    if (v == null) continue;
                    addBodyCell(table, v.getVisitorID() != null ? v.getVisitorID().toString() : "-");
                    addBodyCell(table, nz(v.getVisitorName()));
                    addBodyCell(table, nz(v.getVisitorType()));
                    addBodyCell(table, nz(v.getGender()));
                    addBodyCell(table, nz(v.getIdType()));
                    addBodyCell(table, nz(v.getIdNumber()));
                    addBodyCell(table, v.getDateOfBirth() != null ? v.getDateOfBirth().toString() : "-");
                    addBodyCell(table, v.getCreatedAt() != null ? v.getCreatedAt().toString() : "-");
                }

                doc.add(table);
            } else {
                Paragraph p = new Paragraph("No visitors in this export.", smallFont);
                p.setSpacingAfter(8f);
                doc.add(p);
            }

            // Optional: you can later add Logs / Entries tables here if you want the PDF
            // to mirror the archive report structure fully.
            // For now, this focuses on visitors + stats.

        } finally {
            if (doc.isOpen()) {
                doc.close();
            }
        }

        return baos.toByteArray();
    }

    // ---------- PDF helpers ----------

    private void addHeaderCell(PdfPTable table, String text) {
        Font font = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(4f);
        table.addCell(cell);
    }

    private void addBodyCell(PdfPTable table, String text) {
        Font font = FontFactory.getFont(FontFactory.HELVETICA, 8);
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "", font));
        cell.setPadding(3f);
        table.addCell(cell);
    }

    private int safeSize(List<?> list) {
        return list == null ? 0 : list.size();
    }

    private String nz(String s) {
        return s != null ? s : "-";
    }
}
