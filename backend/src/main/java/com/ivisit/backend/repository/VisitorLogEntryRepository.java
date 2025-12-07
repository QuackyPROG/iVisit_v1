package com.ivisit.backend.repository;

import com.ivisit.backend.model.VisitorLogEntry;
import com.ivisit.backend.model.VisitorLog;
import com.ivisit.backend.model.Station;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;

@Repository
public interface VisitorLogEntryRepository extends JpaRepository<VisitorLogEntry, Long> {
    List<VisitorLogEntry> findByVisitorLog(VisitorLog visitorLog);
    List<VisitorLogEntry> findByStation(Station station);
    List<VisitorLogEntry> findByVisitorLogIn(List<VisitorLog> logs);
    List<VisitorLogEntry> findByArchivedTrue();

    @Query("SELECT e FROM VisitorLogEntry e " +
            "WHERE e.archived = TRUE " +
            "AND (:from IS NULL OR COALESCE(e.archivedAt, e.timestamp) >= :from) " +
            "AND (:to IS NULL   OR COALESCE(e.archivedAt, e.timestamp) < :to)")
    List<VisitorLogEntry> findArchivedInRange(Timestamp from, Timestamp to);
}
