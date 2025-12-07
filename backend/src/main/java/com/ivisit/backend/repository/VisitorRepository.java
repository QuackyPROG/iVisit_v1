package com.ivisit.backend.repository;

import com.ivisit.backend.model.Visitor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;

@Repository
public interface VisitorRepository extends JpaRepository<Visitor, Long> {
    Visitor findByIdNumber(String idNumber);
    boolean existsByIdNumber(String idNumber);
    List<Visitor> findByArchivedFalseOrArchivedIsNull();
    List<Visitor> findByArchivedFalseOrArchivedIsNullAndCreatedAtBefore(Timestamp cutoff);
    List<Visitor> findByArchivedTrue();

    @Query("SELECT v FROM Visitor v " +
            "WHERE v.archived = TRUE " +
            "AND (:from IS NULL OR COALESCE(v.archivedAt, v.createdAt) >= :from) " +
            "AND (:to IS NULL   OR COALESCE(v.archivedAt, v.createdAt) < :to)")
    List<Visitor> findArchivedInRange(Timestamp from, Timestamp to);
}
