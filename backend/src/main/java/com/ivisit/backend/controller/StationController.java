package com.ivisit.backend.controller;

import com.ivisit.backend.dto.StationDTO;
import com.ivisit.backend.dto.StationGuardUpdateRequest;
import com.ivisit.backend.dto.UserAccountDTO;
import com.ivisit.backend.mapper.EntityDtoMapper;
import com.ivisit.backend.model.Station;
import com.ivisit.backend.model.UserAccount;
import com.ivisit.backend.service.StationService;
import com.ivisit.backend.service.UserAccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/stations")
public class StationController {

    @Autowired
    private StationService stationService;

    @Autowired
    private UserAccountService userAccountService;

    @GetMapping
    public ResponseEntity<List<StationDTO>> getAllStations() {
        List<Station> stations = stationService.getAllStations();
        List<StationDTO> dtos = stations.stream()
                .map(EntityDtoMapper::toStationDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getStationById(@PathVariable Long id) {
        Optional<Station> opt = stationService.getStationById(id);
        if (!opt.isPresent()) {
            return ResponseEntity.badRequest().body("Station not found");
        }
        StationDTO dto = EntityDtoMapper.toStationDTO(opt.get());
        return ResponseEntity.ok(dto);
    }

    @PostMapping
    public ResponseEntity<?> createStation(@RequestBody Station station) {
        try {
            Station saved = stationService.createStation(station);
            StationDTO dto = EntityDtoMapper.toStationDTO(saved);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateStation(@PathVariable Long id, @RequestBody Station updatedStation) {
        try {
            Station saved = stationService.updateStation(id, updatedStation);
            StationDTO dto = EntityDtoMapper.toStationDTO(saved);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteStation(@PathVariable Long id) {
        try {
            stationService.deleteStation(id);
            return ResponseEntity.ok("Station deleted successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/active")
    public ResponseEntity<?> setStationActive(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body
    ) {
        Boolean active = body.get("active");
        if (active == null) {
            return ResponseEntity.badRequest().body("Missing 'active' flag");
        }
        try {
            Station updated = stationService.setStationActive(id, active);
            StationDTO dto = EntityDtoMapper.toStationDTO(updated);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}/guards")
    public ResponseEntity<?> getGuardsForStation(@PathVariable Long id) {
        Optional<Station> opt = stationService.getStationById(id);
        if (!opt.isPresent()) {
            return ResponseEntity.badRequest().body("Station not found");
        }

        Station station = opt.get();
        List<UserAccount> assigned = station.getAssignedUsers();
        if (assigned == null) {
            assigned = Collections.emptyList();
        }

        List<UserAccountDTO> dtos = assigned.stream()
                .map(EntityDtoMapper::toUserAccountDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    @PutMapping("/{id}/guards")
    public ResponseEntity<?> updateGuardsForStation(
            @PathVariable Long id,
            @RequestBody StationGuardUpdateRequest request
    ) {
        Optional<Station> opt = stationService.getStationById(id);
        if (!opt.isPresent()) {
            return ResponseEntity.badRequest().body("Station not found");
        }

        Station station = opt.get();
        List<UserAccount> currentAssigned = station.getAssignedUsers();
        if (currentAssigned == null) {
            currentAssigned = new ArrayList<>();
        }

        List<Long> newIds = request.getGuardIds() != null
                ? request.getGuardIds()
                : Collections.emptyList();

        Set<Long> newIdSet = new HashSet<>(newIds);
        Set<Long> currentIdSet = currentAssigned.stream()
                .map(UserAccount::getId)
                .collect(Collectors.toSet());

        // Remove guards that are no longer assigned
        for (Long userId : currentIdSet) {
            if (!newIdSet.contains(userId)) {
                userAccountService.unassignStation(userId, id);
            }
        }

        // Add newly assigned guards
        for (Long userId : newIdSet) {
            if (!currentIdSet.contains(userId)) {
                userAccountService.assignStation(userId, id);
            }
        }

        // Reload and return updated assigned guards
        Optional<Station> refreshedOpt = stationService.getStationById(id);
        Station refreshed = refreshedOpt.orElse(station);
        List<UserAccount> updatedAssigned = refreshed.getAssignedUsers();
        if (updatedAssigned == null) {
            updatedAssigned = Collections.emptyList();
        }

        List<UserAccountDTO> dtos = updatedAssigned.stream()
                .map(EntityDtoMapper::toUserAccountDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }
}
