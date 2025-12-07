package com.ivisit.backend.repository;

import com.ivisit.backend.model.VisitorPass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VisitorPassRepository extends JpaRepository<VisitorPass, Long> {
    VisitorPass findByVisitorPassID(String visitorPassID);
    VisitorPass findByPassNumber(String passNumber);

    List<VisitorPass> findByStatusIgnoreCase(String status);
}
