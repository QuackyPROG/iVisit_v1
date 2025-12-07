package com.ivisit.backend.controller;

import com.ivisit.backend.dto.VisitorPassIncidentDTO;
import com.ivisit.backend.dto.VisitorPassIncidentRequest;
import com.ivisit.backend.mapper.EntityDtoMapper;
import com.ivisit.backend.model.VisitorPassIncident;
import com.ivisit.backend.service.VisitorPassIncidentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/visitorPassIncident")
public class VisitorPassIncidentController {

    @Autowired
    private VisitorPassIncidentService incidentService;

    @PostMapping
    public ResponseEntity<?> createIncident(
            @RequestBody VisitorPassIncidentRequest request
    ) {
        try {
            VisitorPassIncident incident = incidentService.createIncident(request);
            VisitorPassIncidentDTO dto = EntityDtoMapper.toVisitorPassIncidentDTO(incident);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<VisitorPassIncidentDTO>> getIncidents(
            @RequestParam(value = "status", required = false) String status
    ) {
        List<VisitorPassIncident> incidents = incidentService.getIncidentsByStatus(status);
        List<VisitorPassIncidentDTO> dtos = incidents.stream()
                .map(EntityDtoMapper::toVisitorPassIncidentDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PatchMapping("/{id}/close")
    public ResponseEntity<?> closeIncident(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body
    ) {
        try {
            String notes = body != null ? body.get("notes") : null;
            VisitorPassIncident closed = incidentService.closeIncident(id, notes);
            return ResponseEntity.ok(EntityDtoMapper.toVisitorPassIncidentDTO(closed));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
