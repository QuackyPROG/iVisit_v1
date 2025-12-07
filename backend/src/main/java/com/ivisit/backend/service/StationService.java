package com.ivisit.backend.service;

import com.ivisit.backend.model.Station;
import com.ivisit.backend.repository.StationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class StationService {

    @Autowired
    private StationRepository stationRepository;

    public List<Station> getAllStations() {
        return stationRepository.findAll();
    }

    public Optional<Station> getStationById(Long id) {
        return stationRepository.findById(id);
    }

    public Station getStationByName(String name) {
        return stationRepository.findByStationName(name);
    }

    public Station createStation(Station station) {
        String rawName = station.getName();
        if (rawName == null || rawName.trim().isEmpty()) {
            throw new RuntimeException("Station name is required.");
        }

        String name = rawName.trim();

        if (stationRepository.existsByStationNameIgnoreCase(name)) {
            throw new RuntimeException("A station with that name already exists.");
        }

        station.setName(name);
        station.setActive(true);
        return stationRepository.save(station);
    }

    public Station updateStation(Long id, Station updatedStation) {
        Optional<Station> existingOpt = stationRepository.findById(id);
        if (!existingOpt.isPresent()) {
            throw new RuntimeException("Station not found");
        }

        Station existing = existingOpt.get();

        if (updatedStation.getName() != null &&
                !updatedStation.getName().trim().isEmpty()) {

            String newName = updatedStation.getName().trim();

            // Only check if the name is actually changing
            if (!newName.equalsIgnoreCase(existing.getName())) {
                if (stationRepository.existsByStationNameIgnoreCase(newName)) {
                    throw new RuntimeException("A station with that name already exists.");
                }
            }

            existing.setName(newName);
        }

        if (updatedStation.getType() != null) {
            // normalize
            String t = updatedStation.getType().toLowerCase();
            if (!"gate".equals(t) && !"building".equals(t)) {
                t = null; // or throw if you want to be strict
            }
            existing.setType(t);
        }

        if (updatedStation.getActive() != null) {
            existing.setActive(updatedStation.getActive());
        }

        return stationRepository.save(existing);
    }

    // ideally, we won't be using this one
    public void deleteStation(Long id) {
        if (!stationRepository.existsById(id)) {
            throw new RuntimeException("Station not found");
        }
        stationRepository.deleteById(id);
    }

    public Station setStationActive(Long id, boolean active) {
        Station station = stationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Station not found"));
        station.setActive(active);
        return stationRepository.save(station);
    }
}
