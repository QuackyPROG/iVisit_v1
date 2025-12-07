package com.ivisit.backend.controller;

import com.ivisit.backend.dto.VisitorLogDTO;
import com.ivisit.backend.dto.VisitorLogEntryDTO;
import com.ivisit.backend.dto.CreateVisitorLogWithAccessRequest;
import com.ivisit.backend.model.Station;
import com.ivisit.backend.model.VisitorLog;
import com.ivisit.backend.model.VisitorPass;
import com.ivisit.backend.service.VisitorLogService;
import com.ivisit.backend.service.VisitorLogEntryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/visitorLog")
public class VisitorLogController {

    @Autowired
    private VisitorLogService visitorLogService;

    @Autowired
    private VisitorLogEntryService visitorLogEntryService;

    /**
     * Check in a visitor (create a new VisitorLog)
     */
    @PostMapping("/checkin")
    public ResponseEntity<?> checkInVisitor(
            @RequestParam("visitorId") Long visitorId,
            @RequestParam("passId") Long passId
    ) {
        try {
            VisitorLog log = visitorLogService.createLog(visitorId, passId);

            Map<String, Object> response = new HashMap<String, Object>();
            response.put("message", "Visitor checked in successfully");
            response.put("logId", log.getVisitorLogID());
            response.put("visitorId", log.getVisitor().getVisitorID());
            response.put("passId", log.getVisitorPass().getPassID());
            response.put("checkinTime", log.getActiveStart());

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> error = new HashMap<String, Object>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Check in a visitor with purpose + allowed stations (for ScanIdPage flow).
     *
     * POST /api/visitorLog/checkin-with-details
     * Body: CreateVisitorLogWithAccessRequest (JSON)
     */
    @PostMapping("/checkin-with-details")
    public ResponseEntity<?> checkInWithDetails(@RequestBody CreateVisitorLogWithAccessRequest req) {
        try {
            VisitorLog log = visitorLogService.createLogWithDetails(
                    req.getVisitorId(),
                    req.getPassId(),
                    req.getPurposeOfVisit(),
                    req.getAllowedStationIds(),
                    req.getInitialStationId(),
                    req.getGuardAccountId()
            );

            Map<String, Object> response = new HashMap<String, Object>();
            response.put("message", "Visitor checked in successfully");
            response.put("logId", log.getVisitorLogID());
            response.put("visitorId", log.getVisitor().getVisitorID());
            response.put("purposeOfVisit", log.getPurposeOfVisit());

            if (log.getVisitorPass() != null) {
                response.put("passId", log.getVisitorPass().getPassID());
            } else {
                response.put("passId", null);
            }

            // Return allowed station IDs for convenience
            List<Long> allowedIds = (log.getAllowedStations() != null)
                    ? log.getAllowedStations()
                    .stream()
                    .map(Station::getId)
                    .collect(Collectors.toList())
                    : Collections.emptyList();

            response.put("allowedStationIds", allowedIds);

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> error = new HashMap<String, Object>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Check out a visitor (mark the VisitorLog as ended)
     */
    @PostMapping("/checkout")
    public ResponseEntity<?> checkOutVisitor(
            @RequestParam("logId") Long logId,
            @RequestParam(value = "stationId", required = false) Long stationId,
            @RequestParam(value = "guardAccountId", required = false) Long guardAccountId
    ) {
        try {
            VisitorLog log = visitorLogService.endLog(logId, stationId, guardAccountId);

            Map<String, Object> response = new HashMap<String, Object>();
            response.put("message", "Visitor checked out successfully");
            response.put("visitorId", log.getVisitor().getVisitorID());
            response.put("passId", log.getVisitorPass() != null ? log.getVisitorPass().getPassID() : null);
            response.put("checkoutTime", log.getActiveEnd());

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> error = new HashMap<String, Object>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Get all active visitor logs (visitors currently inside) as DTOs
     */
    @GetMapping("/active")
    public ResponseEntity<List<VisitorLogDTO>> getActiveLogs() {
        List<VisitorLogDTO> dtos = visitorLogService.getActiveLogsDTO();
        return ResponseEntity.ok(dtos);
    }

    /**
     * Get all visitor logs (both active and inactive) as DTOs
     */
    @GetMapping("/all")
    public ResponseEntity<List<VisitorLogDTO>> getAllLogs() {
        List<VisitorLogDTO> dtos = visitorLogService.getAllLogsDTO();
        return ResponseEntity.ok(dtos);
    }

    /**
     * Get recent log entries (flattened) for activity feed.
     * Example: GET /api/visitorLog/entries?limit=50
     */
    @GetMapping("/entries")
    public ResponseEntity<List<VisitorLogEntryDTO>> getEntries(
            @RequestParam(value = "limit", required = false) Integer limit
    ) {
        int usedLimit = (limit != null && limit > 0) ? limit : 100;
        List<VisitorLogEntryDTO> dtos = visitorLogEntryService.getRecentEntries(usedLimit);
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/archived")
    public ResponseEntity<List<VisitorLogDTO>> getArchivedLogs() {
        List<VisitorLogDTO> dtos = visitorLogService.getArchivedLogsDTO();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/entries/archived")
    public ResponseEntity<List<VisitorLogEntryDTO>> getArchivedEntries() {
        List<VisitorLogEntryDTO> dtos = visitorLogEntryService.getArchivedEntries();
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/record-entry")
    public ResponseEntity<?> recordEntry(
            @RequestParam("visitorLogId") Long visitorLogId,
            @RequestParam("stationId") Long stationId,
            @RequestParam("accountId") Long accountId
    ) {
        try {
            visitorLogEntryService.recordEntry(visitorLogId, stationId, accountId);
            // We don't need to return the whole DTO; frontend will refresh entries.
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Entry recorded successfully");
            response.put("visitorLogId", visitorLogId);
            response.put("stationId", stationId);
            response.put("accountId", accountId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/grant-pass")
    public ResponseEntity<?> grantPassToLog(
            @RequestParam("logId") Long logId,
            @RequestParam("passId") Long passId
    ) {
        try {
            VisitorLog log = visitorLogService.grantPassToLog(logId, passId);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Visitor pass granted successfully");
            response.put("logId", log.getVisitorLogID());

            if (log.getVisitorPass() != null) {
                VisitorPass pass = log.getVisitorPass();

                String label = "-";
                if (pass.getDisplayCode() != null && !pass.getDisplayCode().trim().isEmpty()) {
                    label = pass.getDisplayCode();
                } else if (pass.getPassNumber() != null && !pass.getPassNumber().trim().isEmpty()) {
                    label = pass.getPassNumber();
                } else if (pass.getPassID() != null) {
                    label = "P-" + pass.getPassID();
                }

                response.put("passId", pass.getPassID());
                response.put("passLabel", label);
            } else {
                response.put("passId", null);
                response.put("passLabel", "-");
            }

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/revoke-pass")
    public ResponseEntity<?> revokePassFromLog(
            @RequestParam("logId") Long logId
    ) {
        try {
            VisitorLog log = visitorLogService.revokePassFromLog(logId);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Visitor pass revoked successfully");
            response.put("logId", log.getVisitorLogID());
            response.put("passId", null);
            response.put("passLabel", "-");

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // emergency end point
    @PostMapping("/admin/soft-close-extra-active-logs/{visitorId}")
    public ResponseEntity<?> softCloseExtraActiveLogs(@PathVariable("visitorId") Long visitorId) {
        try {
            visitorLogService.softCloseExtraActiveLogsForVisitor(visitorId);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Soft-closed extra active logs (if any) for visitor " + visitorId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
