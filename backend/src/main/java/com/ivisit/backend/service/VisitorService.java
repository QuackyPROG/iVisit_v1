package com.ivisit.backend.service;

import com.ivisit.backend.model.Visitor;
import com.ivisit.backend.model.VisitorLog;
import com.ivisit.backend.model.VisitorLogEntry;
import com.ivisit.backend.repository.VisitorLogEntryRepository;
import com.ivisit.backend.repository.VisitorLogRepository;
import com.ivisit.backend.repository.VisitorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Timestamp;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class VisitorService {

    private static final String UPLOAD_DIR = "uploads/";

    @Autowired
    private VisitorRepository visitorRepository;

    @Autowired
    private VisitorLogRepository visitorLogRepository;

    @Autowired
    private VisitorLogEntryRepository visitorLogEntryRepository;

    @Autowired
    private ArchiveService archiveService;

    public Visitor registerVisitor(String visitorName,
                                   String dateOfBirthStr,
                                   String idNumber,
                                   String idType,
                                   String visitorType,
                                   String gender) throws ParseException {

        Date dateOfBirth = new SimpleDateFormat("yyyy-MM-dd").parse(dateOfBirthStr);

        String effectiveVisitorType =
                (visitorType != null && !visitorType.trim().isEmpty())
                        ? visitorType
                        : "Guest";

        String effectiveGender =
                (gender != null && !gender.trim().isEmpty())
                        ? gender
                        : "Unspecified";

        Visitor visitor = new Visitor(
                visitorName,
                effectiveVisitorType,
                idType,
                idNumber,
                dateOfBirth,
                new Timestamp(System.currentTimeMillis())
        );

        visitor.setGender(effectiveGender);

        return visitorRepository.save(visitor);
    }

    // overload that stores file paths
    public Visitor registerVisitor(
            String visitorName,
            String dob,
            String idNumber,
            String idType,
            String visitorType,
            String gender,
            String idImagePath,
            String personPhotoPath
    ) throws ParseException {

        // Reuse the existing logic
        Visitor v = registerVisitor(visitorName, dob, idNumber, idType, visitorType, gender);

        if (idImagePath != null && !idImagePath.isEmpty()) {
            v.setIdImagePath(idImagePath);
        }
        if (personPhotoPath != null && !personPhotoPath.isEmpty()) {
            v.setPhotoPath(personPhotoPath);
        }

        return visitorRepository.save(v);
    }

    public List<Visitor> listAllVisitors() {
        return visitorRepository.findByArchivedFalseOrArchivedIsNull();
    }

    public List<Visitor> listArchivedVisitors() {
        return visitorRepository.findByArchivedTrue();
    }

    public String saveFile(byte[] fileBytes, String originalName, String prefix) throws IOException {
        File uploadDir = new File(UPLOAD_DIR);
        if (!uploadDir.exists()) uploadDir.mkdirs();

        String uniqueName = prefix + System.currentTimeMillis() + "_" + originalName;
        Path path = Paths.get(UPLOAD_DIR, uniqueName);
        Files.write(path, fileBytes);

        // Return a web path that matches the resource handler we’ll configure
        return "/uploads/" + uniqueName;
    }

    /**
     * Archives the given visitors *and* their finished logs + entries,
     * and delegates CSV/PDF generation to ArchiveService.
     */
    public void archiveVisitors(List<Long> visitorIds) throws IOException {
        if (visitorIds == null || visitorIds.isEmpty()) {
            return;
        }

        // 1) Visitors in this manual batch
        List<Visitor> visitors = visitorRepository.findAllById(visitorIds);

        // 2) All finished, non-archived logs for those visitors
        List<VisitorLog> logsToArchive = visitors.stream()
                .filter(Objects::nonNull)
                .flatMap(v ->
                        visitorLogRepository
                                .findByVisitorAndArchivedFalseOrArchivedIsNull(v)
                                .stream()
                                // never archive logs still active
                                .filter(log -> log.getActiveEnd() != null)
                )
                .collect(Collectors.toList());

        // 3) All entries for those logs
        List<VisitorLogEntry> entriesToArchive = logsToArchive.isEmpty()
                ? Collections.emptyList()
                : visitorLogEntryRepository.findByVisitorLogIn(logsToArchive);

        // 4) Delegate CSV + PDF + archived flags to ArchiveService
        archiveService.archiveVisitorsWithRelatedData(
                visitors,
                logsToArchive,
                entriesToArchive
        );
    }

    public List<Visitor> getVisitorsByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return Collections.emptyList();
        return visitorRepository.findAllById(ids);
    }

    public List<VisitorLog> getAllLogs() {
        return visitorLogRepository.findAll();
    }

    public List<VisitorLogEntry> getEntriesForLogs(List<VisitorLog> logs) {
        if (logs == null || logs.isEmpty()) return Collections.emptyList();
        return visitorLogEntryRepository.findByVisitorLogIn(logs);
    }
}
