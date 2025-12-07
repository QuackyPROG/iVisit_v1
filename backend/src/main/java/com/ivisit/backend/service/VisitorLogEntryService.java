package com.ivisit.backend.service;

import com.ivisit.backend.dto.VisitorLogEntryDTO;
import com.ivisit.backend.model.*;
import com.ivisit.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class VisitorLogEntryService {

    @Autowired
    private VisitorLogEntryRepository visitorLogEntryRepository;

    @Autowired
    private VisitorLogRepository visitorLogRepository;

    @Autowired
    private StationRepository stationRepository;

    @Autowired
    private UserAccountRepository userAccountRepository;

    /**
     * Creates a new VisitorLogEntry when a visitor checks in or out at a station.
     */
    public VisitorLogEntry recordEntry(Long visitorLogId, Long stationId, Long accountId) {
        Optional<VisitorLog> logOpt = visitorLogRepository.findById(visitorLogId);
        Optional<Station> stationOpt = stationRepository.findById(stationId);
        Optional<UserAccount> userOpt = userAccountRepository.findById(accountId);

        if (!logOpt.isPresent() || !stationOpt.isPresent() || !userOpt.isPresent()) {
            throw new RuntimeException("Invalid reference: log, station, or user not found");
        }

        VisitorLog log = logOpt.get();
        Station station = stationOpt.get();
        UserAccount user = userOpt.get();

        VisitorLogEntry entry = new VisitorLogEntry(
                log, station, user, new Timestamp(System.currentTimeMillis())
        );

        return visitorLogEntryRepository.save(entry);
    }

    public List<VisitorLogEntryDTO> getRecentEntries(int limit) {
        List<VisitorLogEntry> entries = visitorLogEntryRepository.findAll();

        // sort by timestamp DESC (most recent first)
        Collections.sort(entries, new Comparator<VisitorLogEntry>() {
            @Override
            public int compare(VisitorLogEntry e1, VisitorLogEntry e2) {
                Timestamp t1 = e1.getTimestamp();
                Timestamp t2 = e2.getTimestamp();
                if (t1 == null && t2 == null) return 0;
                if (t1 == null) return 1;
                if (t2 == null) return -1;
                return t2.compareTo(t1); // descending
            }
        });

        if (limit > 0 && entries.size() > limit) {
            entries = entries.subList(0, limit);
        }

        return entries.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<VisitorLogEntryDTO> getArchivedEntries() {
        List<VisitorLogEntry> entries = visitorLogEntryRepository.findByArchivedTrue();
        return entries.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private VisitorLogEntryDTO mapToDTO(VisitorLogEntry entry) {
        VisitorLogEntryDTO dto = new VisitorLogEntryDTO();

        dto.setEntryId(entry.getVisitorLogEntryID());

        VisitorLog log = entry.getVisitorLog();
        Visitor visitor = log != null ? log.getVisitor() : null;
        VisitorPass pass = log != null ? log.getVisitorPass() : null;
        Station station = entry.getStation();
        UserAccount guard = entry.getUserAccount();

        // link entry back to VisitorLog
        dto.setVisitorLogId(log != null ? log.getVisitorLogID() : null);

        // Visitor name & type
        dto.setVisitorName(visitor != null && visitor.getVisitorName() != null
                ? visitor.getVisitorName()
                : "Unknown visitor");
        dto.setVisitorType(visitor != null ? visitor.getVisitorType() : null);

        // Station name
        dto.setStationName(station != null && station.getName() != null
                ? station.getName()
                : "Unknown station");

        // Guard name
        dto.setGuardName(guard != null && guard.getUsername() != null
                ? guard.getUsername()
                : "System");

        // Pass number
        String passNo = null;
        if (pass != null) {
            if (pass.getDisplayCode() != null && !pass.getDisplayCode().trim().isEmpty()) {
                passNo = pass.getDisplayCode();
            } else if (pass.getPassNumber() != null) {
                passNo = String.valueOf(pass.getPassNumber());
            } else if (pass.getPassID() != null) {
                passNo = "P-" + pass.getPassID();
            }
        }
        dto.setPassNo(passNo);

        // Timestamp as ISO string
        Timestamp ts = entry.getTimestamp();
        String tsStr = ts != null ? ts.toInstant().toString() : null;
        dto.setTimestamp(tsStr);

        dto.setArchived(log.getArchived() != null ? log.getArchived() : false);
        dto.setArchivedAt(entry.getArchivedAt() != null ? entry.getArchivedAt().toString() : null);

        return dto;
    }
}
