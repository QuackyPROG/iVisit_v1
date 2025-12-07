package com.ivisit.backend.repository;

import com.ivisit.backend.model.VisitorPassIncident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VisitorPassIncidentRepository extends JpaRepository<VisitorPassIncident, Long> {

    List<VisitorPassIncident> findByStatusIgnoreCase(String status);
}
