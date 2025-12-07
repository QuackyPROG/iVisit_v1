package com.ivisit.backend.repository;

import com.ivisit.backend.model.Station;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StationRepository extends JpaRepository<Station, Long> {
    Station findByStationName(String stationName);
    boolean existsByStationNameIgnoreCase(String stationName);
}
