package com.ivisit.backend.service;

import com.ivisit.backend.dto.VisitorLogDTO;
import com.ivisit.backend.model.*;
import com.ivisit.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class VisitorLogService {

    @Autowired
    private VisitorLogRepository visitorLogRepository;

    @Autowired
    private VisitorRepository visitorRepository;

    @Autowired
    private VisitorPassRepository visitorPassRepository;

    @Autowired
    private StationRepository stationRepository;

    @Autowired
    private VisitorLogEntryRepository visitorLogEntryRepository;

    @Autowired
    private UserAccountRepository userAccountRepository;

    /**
     * Creates a new VisitorLog when a visitor enters.
     */
    public VisitorLog createLog(Long visitorId, Long passId) {
        Optional<Visitor> visitorOpt = visitorRepository.findById(visitorId);
        Optional<VisitorPass> passOpt = visitorPassRepository.findById(passId);

        if (!visitorOpt.isPresent() || !passOpt.isPresent()) {
            throw new RuntimeException("Visitor or VisitorPass not found");
        }

        Visitor visitor = visitorOpt.get();
        VisitorPass pass = passOpt.get();

        // NEW: refuse if visitor already has an active log
        List<VisitorLog> activeForVisitor =
                visitorLogRepository.findByVisitorAndActiveEndIsNull(visitor);
        if (!activeForVisitor.isEmpty()) {
            throw new RuntimeException("Visitor already has an active log. Please end it first.");
        }

        String status = pass.getStatus() != null
                ? pass.getStatus().trim().toUpperCase()
                : "AVAILABLE";

        if (!"AVAILABLE".equals(status)) {
            throw new RuntimeException("Visitor pass is not AVAILABLE and cannot be assigned.");
        }

        VisitorLog log = new VisitorLog(
                visitor,
                pass,
                new Timestamp(System.currentTimeMillis()),
                null
        );

        pass.setStatus("IN_USE");
        visitorPassRepository.save(pass);

        return visitorLogRepository.save(log);
    }

    /**
     * Creates a VisitorLog with purpose + allowed stations
     * and (optionally) records the initial checkpoint entry.
     */
    public VisitorLog createLogWithDetails(Long visitorId,
                                           Long passId,
                                           String purposeOfVisit,
                                           List<Long> allowedStationIds,
                                           Long initialStationId,
                                           Long guardAccountId) {

        Visitor visitor = visitorRepository.findById(visitorId)
                .orElseThrow(() -> new RuntimeException("Visitor not found"));

        // NEW: refuse if visitor already has an active log
        List<VisitorLog> activeForVisitor =
                visitorLogRepository.findByVisitorAndActiveEndIsNull(visitor);
        if (!activeForVisitor.isEmpty()) {
            throw new RuntimeException("Visitor already has an active log. Please end it first.");
        }

        VisitorPass pass = null;
        if (passId != null) {
            pass = visitorPassRepository.findById(passId)
                    .orElseThrow(() -> new RuntimeException("VisitorPass not found"));

            String status = pass.getStatus() != null
                    ? pass.getStatus().trim().toUpperCase()
                    : "AVAILABLE";

            if (!"AVAILABLE".equals(status)) {
                throw new RuntimeException("Visitor pass is not AVAILABLE and cannot be assigned.");
            }
        }

        VisitorLog log = new VisitorLog(
                visitor,
                pass,
                new Timestamp(System.currentTimeMillis()),
                null
        );

        log.setPurposeOfVisit(purposeOfVisit);

        if (allowedStationIds != null && !allowedStationIds.isEmpty()) {
            List<Station> allowedStations = stationRepository.findAllById(allowedStationIds);
            log.setAllowedStations(allowedStations);
        }

        if (pass != null) {
            pass.setStatus("IN_USE");
            visitorPassRepository.save(pass);
        }

        VisitorLog savedLog = visitorLogRepository.save(log);

        if (initialStationId != null && guardAccountId != null) {
            Station station = stationRepository.findById(initialStationId)
                    .orElseThrow(() -> new RuntimeException("Station not found"));
            UserAccount guard = userAccountRepository.findById(guardAccountId)
                    .orElseThrow(() -> new RuntimeException("Guard not found"));

            VisitorLogEntry entry = new VisitorLogEntry(
                    savedLog,
                    station,
                    guard,
                    new Timestamp(System.currentTimeMillis())
            );
            visitorLogEntryRepository.save(entry);
        }

        return savedLog;
    }

    /**
     * Marks a VisitorLog as completed (when visitor exits).
     */
    public VisitorLog endLog(Long visitorLogId, Long stationId, Long guardAccountId) {
        VisitorLog log = visitorLogRepository.findById(visitorLogId)
                .orElseThrow(() -> new RuntimeException("VisitorLog not found"));

        Timestamp now = new Timestamp(System.currentTimeMillis());
        log.setActiveEnd(now);

        // Only free the pass if it was actually IN_USE.
        // Do NOT override LOST/INACTIVE/RETIRED (or anything else).
        VisitorPass pass = log.getVisitorPass();
        if (pass != null) {
            String status = pass.getStatus() != null
                    ? pass.getStatus().trim().toUpperCase()
                    : "AVAILABLE";

            if ("IN_USE".equals(status)) {
                pass.setStatus("AVAILABLE");
                visitorPassRepository.save(pass);
            }
        }

        // Optionally record an exit entry at the station performing End Log
        if (stationId != null && guardAccountId != null) {
            Station station = stationRepository.findById(stationId)
                    .orElseThrow(() -> new RuntimeException("Station not found"));
            UserAccount guard = userAccountRepository.findById(guardAccountId)
                    .orElseThrow(() -> new RuntimeException("Guard not found"));

            VisitorLogEntry exitEntry = new VisitorLogEntry(
                    log,
                    station,
                    guard,
                    now
            );
            visitorLogEntryRepository.save(exitEntry);

            if (log.getVisitorLogEntries() != null) {
                log.getVisitorLogEntries().add(exitEntry);
            } else {
                log.setVisitorLogEntries(Collections.singletonList(exitEntry));
            }
        }

        return visitorLogRepository.save(log);
    }

    /**
     * Lists all active VisitorLogs (no activeEnd timestamp yet)
     */
    public List<VisitorLog> getActiveLogs() {
        return visitorLogRepository.findByActiveEndIsNull();
    }

    /**
     * Lists all logs (active or inactive)
     */
    public List<VisitorLog> getAllLogs() {
        return visitorLogRepository.findAll();
    }

    // ------------------------
    // DTO-related helpers
    // ------------------------

    /**
     * Return DTOs for all logs (for UI/LogBook).
     */
    public List<VisitorLogDTO> getAllLogsDTO() {
        List<VisitorLog> logs = getAllLogs();
        return logs.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    /**
     * Return DTOs for active logs (for UI).
     */
    public List<VisitorLogDTO> getActiveLogsDTO() {
        List<VisitorLog> logs = getActiveLogs();
        return logs.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    public List<VisitorLog> getArchivedLogs() {
        return visitorLogRepository.findByArchivedTrue();
    }

    public List<VisitorLogDTO> getArchivedLogsDTO() {
        List<VisitorLog> logs = getArchivedLogs();
        return logs.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    /**
     * Map a VisitorLog entity into VisitorLogDTO used by the frontend LogBook.
     * Conservative: fills missing values with sensible defaults.
     */
    private VisitorLogDTO mapToDTO(VisitorLog log) {
        Visitor visitor = log.getVisitor();
        VisitorPass pass = log.getVisitorPass();

        String fullName = visitor != null ? visitor.getVisitorName() : "Unknown";
        String idType = visitor != null ? visitor.getIdType() : "-";

        String passNo = "-";
        if (pass != null) {
            if (pass.getDisplayCode() != null && !pass.getDisplayCode().trim().isEmpty()) {
                passNo = pass.getDisplayCode();
            } else if (pass.getPassNumber() != null && !pass.getPassNumber().trim().isEmpty()) {
                passNo = pass.getPassNumber();
            } else if (pass.getPassID() != null) {
                passNo = "P-" + pass.getPassID();
            }
        }

        VisitorLogEntry firstEntry = null;
        VisitorLogEntry latestEntry = null;

        List<VisitorLogEntry> rawEntries = log.getVisitorLogEntries();
        if (rawEntries != null && !rawEntries.isEmpty()) {
            List<VisitorLogEntry> entries = new ArrayList<>(rawEntries);
            entries.sort(Comparator.comparing(VisitorLogEntry::getTimestamp));

            firstEntry  = entries.get(0);
            latestEntry = entries.get(entries.size() - 1);
        }

        String firstLocation = "N/A";
        if (firstEntry != null &&
                firstEntry.getStation() != null &&
                firstEntry.getStation().getName() != null) {
            firstLocation = firstEntry.getStation().getName();
        }

        String location = "N/A";
        if (latestEntry != null &&
                latestEntry.getStation() != null &&
                latestEntry.getStation().getName() != null) {
            location = latestEntry.getStation().getName();
        }

        String loggedBy = "System";
        if (latestEntry != null &&
                latestEntry.getUserAccount() != null &&
                latestEntry.getUserAccount().getUsername() != null) {
            loggedBy = latestEntry.getUserAccount().getUsername();
        }

        Timestamp usedTs = null;
        if (latestEntry != null && latestEntry.getTimestamp() != null) {
            usedTs = latestEntry.getTimestamp();
        } else if (log.getActiveStart() != null) {
            usedTs = log.getActiveStart();
        }

        String dateStr = usedTs != null
                ? usedTs.toLocalDateTime().toLocalDate().toString()
                : "N/A";
        String timeStr = usedTs != null
                ? usedTs.toLocalDateTime().toLocalTime().toString()
                : "N/A";

        String purposeOfVisit =
                (log.getPurposeOfVisit() != null && !log.getPurposeOfVisit().trim().isEmpty())
                        ? log.getPurposeOfVisit()
                        : "N/A";

        List<String> allowedStationNames = Collections.emptyList();
        if (log.getAllowedStations() != null && !log.getAllowedStations().isEmpty()) {
            allowedStationNames = log.getAllowedStations().stream()
                    .filter(Objects::nonNull)
                    .map(Station::getName)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        }

        VisitorLogDTO dto = new VisitorLogDTO();
        dto.setVisitorLogID(log.getVisitorLogID());
        dto.setFullName(fullName);
        dto.setIdType(idType);
        dto.setPassNo(passNo);
        dto.setLocation(location);
        dto.setFirstLocation(firstLocation);
        dto.setPurposeOfVisit(purposeOfVisit);
        dto.setLoggedBy(loggedBy);
        dto.setDate(dateStr);
        dto.setTime(timeStr);
        dto.setAllowedStations(allowedStationNames);
        dto.setArchived(log.getArchived() != null ? log.getArchived() : false);
        dto.setArchivedAt(log.getArchivedAt() != null ? log.getArchivedAt().toString() : null);
        if (visitor != null) {
            dto.setVisitorID(visitor.getVisitorID());
        }

        return dto;
    }

    /**
     * Assigns a VisitorPass to an active VisitorLog.
     * - Pass must exist and be AVAILABLE.
     * - Log must exist and not be ended.
     * - If the log already has a different pass, that pass is freed back to AVAILABLE.
     */
    public VisitorLog grantPassToLog(Long visitorLogId, Long passId) {
        VisitorLog log = visitorLogRepository.findById(visitorLogId)
                .orElseThrow(() -> new RuntimeException("VisitorLog not found"));

        if (log.getActiveEnd() != null) {
            throw new RuntimeException("Cannot assign a pass to an ended log.");
        }

        VisitorPass pass = visitorPassRepository.findById(passId)
                .orElseThrow(() -> new RuntimeException("VisitorPass not found"));

        if (pass.getStatus() == null ||
                !"AVAILABLE".equalsIgnoreCase(pass.getStatus())) {
            throw new RuntimeException("Visitor pass is not AVAILABLE and cannot be assigned.");
        }

        // If there was an existing pass on this log and it's different, free it
        VisitorPass currentPass = log.getVisitorPass();
        if (currentPass != null &&
                currentPass.getPassID() != null &&
                !currentPass.getPassID().equals(pass.getPassID())) {

            currentPass.setStatus("AVAILABLE");
            visitorPassRepository.save(currentPass);
        }

        // Now assign the new pass
        pass.setStatus("IN_USE");
        visitorPassRepository.save(pass);

        log.setVisitorPass(pass);
        return visitorLogRepository.save(log);
    }

    /**
     * Revokes (unlinks) the VisitorPass from a VisitorLog without ending the log.
     * - Pass is set back to AVAILABLE.
     * - visitorPass on the log is set to null.
     */
    public VisitorLog revokePassFromLog(Long visitorLogId) {
        VisitorLog log = visitorLogRepository.findById(visitorLogId)
                .orElseThrow(() -> new RuntimeException("VisitorLog not found"));

        VisitorPass pass = log.getVisitorPass();
        if (pass != null) {
            pass.setStatus("AVAILABLE");
            visitorPassRepository.save(pass);
            log.setVisitorPass(null);
        }

        return visitorLogRepository.save(log);
    }

    // emergency function to remove ghost logs
    public void softCloseExtraActiveLogsForVisitor(Long visitorId) {
        Visitor visitor = visitorRepository.findById(visitorId)
                .orElseThrow(() -> new RuntimeException("Visitor not found"));

        List<VisitorLog> active = visitorLogRepository.findByVisitorAndActiveEndIsNull(visitor);
        if (active.size() <= 1) {
            return;
        }

        active.sort(Comparator.comparing(VisitorLog::getActiveStart));
        VisitorLog keep = active.get(active.size() - 1);

        for (int i = 0; i < active.size() - 1; i++) {
            VisitorLog ghost = active.get(i);
            if (ghost.getActiveEnd() == null) {
                ghost.setActiveEnd(new Timestamp(System.currentTimeMillis()));
                // intentionally do not touch ghost.getVisitorPass().status here
                visitorLogRepository.save(ghost);
            }
        }
    }
}
