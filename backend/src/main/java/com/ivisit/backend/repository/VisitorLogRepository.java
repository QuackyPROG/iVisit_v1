package com.ivisit.backend.repository;

import com.ivisit.backend.model.VisitorLog;
import com.ivisit.backend.model.Visitor;
import com.ivisit.backend.model.VisitorPass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;

@Repository
public interface VisitorLogRepository extends JpaRepository<VisitorLog, Long> {
    List<VisitorLog> findByVisitor(Visitor visitor);
    List<VisitorLog> findByVisitorPass(VisitorPass visitorPass);
    List<VisitorLog> findByActiveEndIsNull(); // for active logs
    List<VisitorLog> findByArchivedFalseOrArchivedIsNull();
    List<VisitorLog> findByVisitorAndArchivedFalseOrArchivedIsNull(Visitor visitor);
    List<VisitorLog> findByArchivedTrue();
    List<VisitorLog> findByVisitorAndActiveEndIsNull(Visitor visitor);

    @Query("SELECT l FROM VisitorLog l " +
            "WHERE l.archived = TRUE " +
            "AND (:from IS NULL OR COALESCE(l.archivedAt, l.activeEnd, l.activeStart) >= :from) " +
            "AND (:to IS NULL   OR COALESCE(l.archivedAt, l.activeEnd, l.activeStart) < :to)")
    List<VisitorLog> findArchivedInRange(Timestamp from, Timestamp to);
}
