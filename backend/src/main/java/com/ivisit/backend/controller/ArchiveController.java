package com.ivisit.backend.controller;

import com.ivisit.backend.model.Visitor;
import com.ivisit.backend.model.VisitorLog;
import com.ivisit.backend.model.VisitorLogEntry;
import com.ivisit.backend.repository.VisitorLogEntryRepository;
import com.ivisit.backend.repository.VisitorLogRepository;
import com.ivisit.backend.repository.VisitorRepository;
import com.ivisit.backend.service.ArchiveService;
import com.lowagie.text.DocumentException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/archive")
public class ArchiveController {

    @Autowired
    private VisitorRepository visitorRepository;

    @Autowired
    private VisitorLogRepository visitorLogRepository;

    @Autowired
    private VisitorLogEntryRepository visitorLogEntryRepository;

    @Autowired
    private ArchiveService archiveService;

    @GetMapping("/visitors/export")
    public ResponseEntity<Resource> exportArchivedVisitorsCsv(
            @RequestParam(value = "from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(value = "to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        Timestamp fromTs = null;
        Timestamp toTs = null;

        if (fromDate != null) {
            LocalDateTime startOfDay = fromDate.atStartOfDay();
            fromTs = Timestamp.valueOf(startOfDay);
        }

        if (toDate != null) {
            LocalDateTime startOfNextDay = toDate.plusDays(1).atStartOfDay();
            toTs = Timestamp.valueOf(startOfNextDay);
        }

        List<Visitor> visitors = visitorRepository.findArchivedInRange(fromTs, toTs);
        byte[] csvBytes = archiveService.buildArchivedVisitorsCsv(visitors);

        if (csvBytes.length == 0) {
            String headerOnly = "visitorID,visitorName,visitorType,gender,idType,idNumber,dateOfBirth,createdAt,archived,archivedAt\n";
            csvBytes = headerOnly.getBytes(StandardCharsets.UTF_8);
        }

        ByteArrayResource resource = new ByteArrayResource(csvBytes);
        String filename = buildVisitorsFilename(fromDate, toDate);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
                .contentLength(csvBytes.length)
                .body(resource);
    }

    @GetMapping("/logs/export")
    public ResponseEntity<Resource> exportArchivedLogsCsv(
            @RequestParam(value = "from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(value = "to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        Timestamp fromTs = null;
        Timestamp toTs = null;

        if (fromDate != null) {
            fromTs = Timestamp.valueOf(fromDate.atStartOfDay());
        }
        if (toDate != null) {
            toTs = Timestamp.valueOf(toDate.plusDays(1).atStartOfDay());
        }

        List<VisitorLog> logs = visitorLogRepository.findArchivedInRange(fromTs, toTs);
        byte[] csvBytes = archiveService.buildArchivedLogsCsv(logs);

        if (csvBytes.length == 0) {
            String headerOnly = "visitorLogID,visitorID,purposeOfVisit,passLabel,activeStart,activeEnd,firstLocation,lastLocation,archived,archivedAt\n";
            csvBytes = headerOnly.getBytes(StandardCharsets.UTF_8);
        }

        ByteArrayResource resource = new ByteArrayResource(csvBytes);
        String filename = buildLogsFilename(fromDate, toDate);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
                .contentLength(csvBytes.length)
                .body(resource);
    }

    private String buildLogsFilename(LocalDate from, LocalDate to) {
        String base = "archived-logs";
        if (from == null && to == null) {
            return base + ".csv";
        }
        if (from != null && to == null) {
            return base + "-" + from.toString() + ".csv";
        }
        if (from == null) {
            return base + "-until-" + to.toString() + ".csv";
        }
        if (from.equals(to)) {
            return base + "-" + from.toString() + ".csv";
        }
        return base + "-" + from.toString() + "_to_" + to.toString() + ".csv";
    }

    @GetMapping("/entries/export")
    public ResponseEntity<Resource> exportArchivedEntriesCsv(
            @RequestParam(value = "from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(value = "to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        Timestamp fromTs = null;
        Timestamp toTs = null;

        if (fromDate != null) {
            fromTs = Timestamp.valueOf(fromDate.atStartOfDay());
        }
        if (toDate != null) {
            toTs = Timestamp.valueOf(toDate.plusDays(1).atStartOfDay());
        }

        List<VisitorLogEntry> entries = visitorLogEntryRepository.findArchivedInRange(fromTs, toTs);
        byte[] csvBytes = archiveService.buildArchivedEntriesCsv(entries);

        if (csvBytes.length == 0) {
            String headerOnly = "visitorLogEntryID,visitorLogID,stationName,guardName,passLabel,timestamp,archived,archivedAt\n";
            csvBytes = headerOnly.getBytes(StandardCharsets.UTF_8);
        }

        ByteArrayResource resource = new ByteArrayResource(csvBytes);
        String filename = buildEntriesFilename(fromDate, toDate);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
                .contentLength(csvBytes.length)
                .body(resource);
    }

    private String buildEntriesFilename(LocalDate from, LocalDate to) {
        String base = "archived-entries";
        if (from == null && to == null) {
            return base + ".csv";
        }
        if (from != null && to == null) {
            return base + "-" + from.toString() + ".csv";
        }
        if (from == null) {
            return base + "-until-" + to.toString() + ".csv";
        }
        if (from.equals(to)) {
            return base + "-" + from.toString() + ".csv";
        }
        return base + "-" + from.toString() + "_to_" + to.toString() + ".csv";
    }

    private String buildVisitorsFilename(LocalDate from, LocalDate to) {
        String base = "archived-visitors";
        if (from == null && to == null) {
            return base + ".csv";
        }
        if (from != null && to == null) {
            return base + "-" + from.toString() + ".csv";
        }
        if (from == null) {
            return base + "-until-" + to.toString() + ".csv";
        }
        if (from.equals(to)) {
            return base + "-" + from.toString() + ".csv";
        }
        return base + "-" + from.toString() + "_to_" + to.toString() + ".csv";
    }

    @GetMapping("/report")
    public ResponseEntity<Resource> exportArchiveReportPdf(
            @RequestParam(value = "from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(value = "to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) throws DocumentException {
        Timestamp fromTs = null;
        Timestamp toTs = null;

        if (fromDate != null) {
            fromTs = Timestamp.valueOf(fromDate.atStartOfDay());
        }
        if (toDate != null) {
            toTs = Timestamp.valueOf(toDate.plusDays(1).atStartOfDay());
        }

        List<Visitor> visitors = visitorRepository.findArchivedInRange(fromTs, toTs);
        List<VisitorLog> logs = visitorLogRepository.findArchivedInRange(fromTs, toTs);
        List<VisitorLogEntry> entries = visitorLogEntryRepository.findArchivedInRange(fromTs, toTs);

        byte[] pdfBytes = archiveService.buildArchiveReportPdf(visitors, logs, entries, fromDate, toDate);

        ByteArrayResource resource = new ByteArrayResource(pdfBytes);
        String filename = buildReportFilename(fromDate, toDate);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(pdfBytes.length)
                .body(resource);
    }

    private String buildReportFilename(LocalDate from, LocalDate to) {
        String base = "archive-report";
        if (from == null && to == null) {
            return base + ".pdf";
        }
        if (from != null && to == null) {
            return base + "-" + from.toString() + ".pdf";
        }
        if (from == null) {
            return base + "-until-" + to.toString() + ".pdf";
        }
        if (from.equals(to)) {
            return base + "-" + from.toString() + ".pdf";
        }
        return base + "-" + from.toString() + "_to_" + to.toString() + ".pdf";
    }
}
