package com.ivisit.backend.jobs;

import com.ivisit.backend.model.Visitor;
import com.ivisit.backend.model.VisitorLog;
import com.ivisit.backend.model.VisitorLogEntry;
import com.ivisit.backend.repository.VisitorLogEntryRepository;
import com.ivisit.backend.repository.VisitorLogRepository;
import com.ivisit.backend.repository.VisitorRepository;
import com.ivisit.backend.service.ArchiveService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Component
public class VisitorArchiveScheduler {

    @Autowired
    private VisitorRepository visitorRepository;

    @Autowired
    private VisitorLogRepository visitorLogRepository;

    @Autowired
    private VisitorLogEntryRepository visitorLogEntryRepository;

    @Autowired
    private ArchiveService archiveService;

    @Scheduled(cron = "0 30 2 * * ?")
    public void archiveOldVisitorsWithLogs() {
        LocalDate oneYearAgo = LocalDate.now().minus(1, ChronoUnit.YEARS);
        Instant cutoffInstant = oneYearAgo.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Timestamp cutoff = Timestamp.from(cutoffInstant);

        List<Visitor> candidates = visitorRepository.findByArchivedFalseOrArchivedIsNull();
        if (candidates.isEmpty()) return;

        List<Visitor> visitorsToArchive = new ArrayList<>();
        List<VisitorLog> logsToArchive = new ArrayList<>();

        for (Visitor v : candidates) {
            List<VisitorLog> logsForVisitor =
                    visitorLogRepository.findByVisitorAndArchivedFalseOrArchivedIsNull(v);

            if (hasActiveLog(logsForVisitor)) {
                continue;
            }

            Timestamp lastActivity = computeLastActivity(v, logsForVisitor);
            if (lastActivity == null) {
                continue;
            }

            if (lastActivity.before(cutoff)) {
                visitorsToArchive.add(v);
                logsToArchive.addAll(logsForVisitor);
            }
        }

        if (visitorsToArchive.isEmpty()) return;

        List<VisitorLogEntry> entriesToArchive =
                logsToArchive.isEmpty()
                        ? new ArrayList<>()
                        : visitorLogEntryRepository.findByVisitorLogIn(logsToArchive);

        try {
            archiveService.archiveVisitorsWithRelatedData(visitorsToArchive, logsToArchive, entriesToArchive);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private boolean hasActiveLog(List<VisitorLog> logs) {
        for (VisitorLog log : logs) {
            if (log.getActiveEnd() == null) {
                return true;
            }
        }
        return false;
    }

    private Timestamp computeLastActivity(Visitor visitor, List<VisitorLog> logs) {
        Timestamp last = visitor.getCreatedAt();

        for (VisitorLog log : logs) {
            if (log.getActiveStart() != null &&
                    (last == null || log.getActiveStart().after(last))) {
                last = log.getActiveStart();
            }
            if (log.getActiveEnd() != null &&
                    (last == null || log.getActiveEnd().after(last))) {
                last = log.getActiveEnd();
            }

            List<VisitorLogEntry> entries = log.getVisitorLogEntries();
            if (entries != null) {
                for (VisitorLogEntry e : entries) {
                    if (e.getTimestamp() != null &&
                            (last == null || e.getTimestamp().after(last))) {
                        last = e.getTimestamp();
                    }
                }
            }
        }

        return last;
    }
}
