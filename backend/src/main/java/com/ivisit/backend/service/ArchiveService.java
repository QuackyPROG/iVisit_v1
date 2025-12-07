package com.ivisit.backend.service;

import com.ivisit.backend.model.Visitor;
import com.ivisit.backend.model.VisitorLog;
import com.ivisit.backend.model.VisitorLogEntry;
import com.ivisit.backend.repository.VisitorLogEntryRepository;
import com.ivisit.backend.repository.VisitorLogRepository;
import com.ivisit.backend.repository.VisitorRepository;
import com.lowagie.text.DocumentException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
public class ArchiveService {

    @Autowired
    private VisitorRepository visitorRepository;

    @Autowired
    private VisitorLogRepository visitorLogRepository;

    @Autowired
    private VisitorLogEntryRepository visitorLogEntryRepository;

    @Autowired
    private ExportService exportService;

    /**
     * Archives the given visitors + their finished logs + entries.
     * Sets archived flags + a single shared archivedAt timestamp.
     */
    public void archiveVisitorsWithRelatedData(
            List<Visitor> visitors,
            List<VisitorLog> logs,
            List<VisitorLogEntry> entries
    ) throws IOException {

        if (visitors == null || visitors.isEmpty()) return;

        Timestamp archivedAt = Timestamp.from(Instant.now());

        for (Visitor v : visitors) {
            if (v != null) {
                v.setArchived(true);
                v.setArchivedAt(archivedAt);
            }
        }
        visitorRepository.saveAll(visitors);

        if (logs != null && !logs.isEmpty()) {
            for (VisitorLog log : logs) {
                if (log != null) {
                    log.setArchived(true);
                    log.setArchivedAt(archivedAt);
                }
            }
            visitorLogRepository.saveAll(logs);
        }

        if (entries != null && !entries.isEmpty()) {
            for (VisitorLogEntry entry : entries) {
                if (entry != null) {
                    entry.setArchived(true);
                    entry.setArchivedAt(archivedAt);
                }
            }
            visitorLogEntryRepository.saveAll(entries);
        }
    }

    // ----------------------------------------------------------------
    // Legacy / compatibility wrappers for CSV/PDF builders.
    // Actual implementation lives in ExportService now.
    // ----------------------------------------------------------------

    public byte[] buildArchivedVisitorsCsv(List<Visitor> visitors) {
        return exportService.buildVisitorsCsv(visitors);
    }

    public byte[] buildArchivedLogsCsv(List<VisitorLog> logs) {
        return exportService.buildLogsCsv(logs);
    }

    public byte[] buildArchivedEntriesCsv(List<VisitorLogEntry> entries) {
        return exportService.buildEntriesCsv(entries);
    }

    public byte[] buildArchiveReportPdf(
            List<Visitor> visitors,
            List<VisitorLog> logs,
            List<VisitorLogEntry> entries,
            LocalDate fromDate,
            LocalDate toDate
    ) throws DocumentException {
        return exportService.buildArchiveReportPdf(visitors, logs, entries, fromDate, toDate);
    }
}
