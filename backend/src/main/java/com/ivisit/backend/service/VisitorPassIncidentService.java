package com.ivisit.backend.service;

import com.ivisit.backend.dto.VisitorPassIncidentRequest;
import com.ivisit.backend.model.*;
import com.ivisit.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.util.List;

@Service
public class VisitorPassIncidentService {

    @Autowired
    private VisitorPassIncidentRepository incidentRepository;

    @Autowired
    private VisitorPassRepository visitorPassRepository;

    @Autowired
    private VisitorRepository visitorRepository;

    @Autowired
    private VisitorLogRepository visitorLogRepository;

    @Autowired
    private StationRepository stationRepository;

    @Autowired
    private UserAccountRepository userAccountRepository;

    public VisitorPassIncident createIncident(VisitorPassIncidentRequest request) {
        if (request.getPassId() == null) {
            throw new RuntimeException("passId is required for an incident.");
        }

        VisitorPass pass = visitorPassRepository.findById(request.getPassId())
                .orElseThrow(() -> new RuntimeException("VisitorPass not found"));

        VisitorPassIncident incident = new VisitorPassIncident();
        incident.setVisitorPass(pass);

        if (request.getVisitorId() != null) {
            visitorRepository.findById(request.getVisitorId())
                    .ifPresent(incident::setVisitor);
        }

        if (request.getVisitorLogId() != null) {
            visitorLogRepository.findById(request.getVisitorLogId())
                    .ifPresent(incident::setVisitorLog);
        }

        if (request.getStationId() != null) {
            stationRepository.findById(request.getStationId())
                    .ifPresent(incident::setStation);
        }

        if (request.getGuardAccountId() != null) {
            userAccountRepository.findById(request.getGuardAccountId())
                    .ifPresent(incident::setReportedBy);
        }

        // Normalize type to UPPERCASE, default OTHER
        String type = request.getIncidentType() != null
                ? request.getIncidentType().trim().toUpperCase()
                : "OTHER";
        incident.setIncidentType(type);

        incident.setDescription(request.getDescription());
        incident.setStatus("OPEN");
        incident.setReportedAt(new Timestamp(System.currentTimeMillis()));

        // Save the incident first
        VisitorPassIncident saved = incidentRepository.save(incident);

        // If incident is LOST / NOT_RETURNED, auto-mark the pass as LOST (unless already terminal)
        if ("LOST".equals(type) || "NOT_RETURNED".equals(type)) {
            String currentStatus = pass.getStatus() != null
                    ? pass.getStatus().trim().toUpperCase()
                    : "";

            if (!"LOST".equals(currentStatus)
                    && !"INACTIVE".equals(currentStatus)
                    && !"RETIRED".equals(currentStatus)) {
                pass.setStatus("LOST");
                visitorPassRepository.save(pass);
            }
        }

        return saved;
    }

    public List<VisitorPassIncident> getAllIncidents() {
        return incidentRepository.findAll();
    }

    public List<VisitorPassIncident> getIncidentsByStatus(String status) {
        if (status == null || status.trim().isEmpty()) {
            return getAllIncidents();
        }
        return incidentRepository.findByStatusIgnoreCase(status);
    }

    public VisitorPassIncident closeIncident(Long incidentId, String notes) {
        VisitorPassIncident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new RuntimeException("Incident not found"));

        if ("CLOSED".equalsIgnoreCase(incident.getStatus())) {
            throw new RuntimeException("Incident is already closed.");
        }

        incident.setStatus("CLOSED");
        incident.setResolvedAt(new Timestamp(System.currentTimeMillis()));
        incident.setResolutionNotes(notes != null ? notes.trim() : null);

        return incidentRepository.save(incident);
    }
}
