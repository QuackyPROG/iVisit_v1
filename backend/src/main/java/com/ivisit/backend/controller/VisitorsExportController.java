package com.ivisit.backend.controller;

import com.ivisit.backend.dto.ArchiveVisitorsRequest;
import com.ivisit.backend.model.Visitor;
import com.ivisit.backend.model.VisitorLog;
import com.ivisit.backend.model.VisitorLogEntry;
import com.ivisit.backend.repository.VisitorLogEntryRepository;
import com.ivisit.backend.repository.VisitorLogRepository;
import com.ivisit.backend.repository.VisitorRepository;
import com.ivisit.backend.service.ExportService;
import com.lowagie.text.DocumentException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@RestController
@RequestMapping("/api/visitors/export")
public class VisitorsExportController {

    @Autowired
    private VisitorRepository visitorRepository;

    @Autowired
    private VisitorLogRepository visitorLogRepository;

    @Autowired
    private VisitorLogEntryRepository visitorLogEntryRepository;

    @Autowired
    private ExportService exportService;

    @PostMapping("/pdf")
    public ResponseEntity<?> exportVisitorsPdf(@RequestBody ArchiveVisitorsRequest request) {
        if (request.getVisitorIds() == null || request.getVisitorIds().isEmpty()) {
            return ResponseEntity.badRequest().body("No visitor IDs provided for export.");
        }

        try {
            // Fetch visitors by IDs
            List<Visitor> visitors = visitorRepository.findAllById(request.getVisitorIds());

            // Fetch ALL logs related to those visitors (archived + non-archived)
            List<VisitorLog> logs = new ArrayList<>();
            for (Visitor v : visitors) {
                if (v == null) continue;
                logs.addAll(visitorLogRepository.findByVisitor(v));
            }

            // Fetch all entries for those logs
            List<VisitorLogEntry> entries =
                    logs.isEmpty()
                            ? new ArrayList<>()
                            : visitorLogEntryRepository.findByVisitorLogIn(logs);

            byte[] pdfBytes = exportService.buildVisitorsSelectionPdf(visitors, logs, entries);

            String filename = buildPdfFilename();

            ByteArrayResource resource = new ByteArrayResource(pdfBytes);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.APPLICATION_PDF)
                    .contentLength(pdfBytes.length)
                    .body(resource);

        } catch (DocumentException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body("Failed to generate visitors PDF: " + e.getMessage());
        }
    }

    @PostMapping("/csv")
    public ResponseEntity<?> exportVisitorsCsvZip(@RequestBody ArchiveVisitorsRequest request) {
        if (request.getVisitorIds() == null || request.getVisitorIds().isEmpty()) {
            return ResponseEntity.badRequest().body("No visitor IDs provided for export.");
        }

        try {
            // Fetch visitors by IDs
            List<Visitor> visitors = visitorRepository.findAllById(request.getVisitorIds());

            // Fetch ALL logs related to those visitors (archived + non-archived)
            List<VisitorLog> logs = new ArrayList<>();
            for (Visitor v : visitors) {
                if (v == null) continue;
                logs.addAll(visitorLogRepository.findByVisitor(v));
            }

            // Fetch all entries for those logs
            List<VisitorLogEntry> entries =
                    logs.isEmpty()
                            ? new ArrayList<>()
                            : visitorLogEntryRepository.findByVisitorLogIn(logs);

            // Build individual CSVs using ExportService
            byte[] visitorsCsv = exportService.buildVisitorsCsv(visitors);
            byte[] logsCsv = exportService.buildLogsCsv(logs);
            byte[] entriesCsv = exportService.buildEntriesCsv(entries);

            // Pack into a ZIP (similar to frontend JSZip)
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            try (ZipOutputStream zos = new ZipOutputStream(baos)) {
                // visitors.csv
                ZipEntry visitorsEntry = new ZipEntry("visitors.csv");
                zos.putNextEntry(visitorsEntry);
                zos.write(visitorsCsv);
                zos.closeEntry();

                // visitor_logs.csv
                ZipEntry logsEntry = new ZipEntry("visitor_logs.csv");
                zos.putNextEntry(logsEntry);
                zos.write(logsCsv);
                zos.closeEntry();

                // visitor_log_entries.csv
                ZipEntry entriesEntry = new ZipEntry("visitor_log_entries.csv");
                zos.putNextEntry(entriesEntry);
                zos.write(entriesCsv);
                zos.closeEntry();
            }

            byte[] zipBytes = baos.toByteArray();
            String filename = buildCsvZipFilename();

            ByteArrayResource resource = new ByteArrayResource(zipBytes);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType("application/zip"))
                    .contentLength(zipBytes.length)
                    .body(resource);

        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body("Failed to generate visitors CSV ZIP: " + e.getMessage());
        }
    }

    private String buildPdfFilename() {
        String ts = Instant.now().toString().replace(":", "-").replace(".", "-");
        return "visitors-export-" + ts + ".pdf";
    }

    private String buildCsvZipFilename() {
        String ts = Instant.now().toString().replace(":", "-").replace(".", "-");
        return "visitors-export-" + ts + ".zip";
    }
}
