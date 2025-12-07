package com.ivisit.backend.mapper;

import com.ivisit.backend.dto.*;
import com.ivisit.backend.model.*;

import java.util.List;
import java.util.stream.Collectors;

public class EntityDtoMapper {

    // ---------- Station ----------
    public static StationDTO toStationDTO(Station station) {
        if (station == null) return null;
        StationDTO dto = new StationDTO();
        dto.setStationID(station.getId());
        dto.setStationName(station.getName());
        dto.setStationType(station.getType());
        dto.setActive(station.getActive());
        return dto;
    }


    // ---------- UserAccount ----------
    public static UserAccountDTO toUserAccountDTO(UserAccount user) {
        if (user == null) return null;

        List<Long> stationIds = null;
        if (user.getAssignedStations() != null) {
            stationIds = user.getAssignedStations()
                    .stream()
                    .map(Station::getId)
                    .collect(Collectors.toList());
        }

        UserAccountDTO dto = new UserAccountDTO(
                user.getId(),
                user.getUsername(),
                user.getEmailAddress(),
                user.getAccountType(),
                stationIds
        );
        dto.setActive(user.getActive());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setEmailVerified(user.getEmailVerified());
        dto.setEmailVerifiedAt(user.getEmailVerifiedAt());

        return dto;
    }


    // ---------- VisitorPass ----------
    public static VisitorPassDTO toVisitorPassDTO(VisitorPass pass) {
        if (pass == null) return null;

        VisitorPassDTO dto = new VisitorPassDTO();
        dto.setPassID(pass.getPassID());
        dto.setPassNumber(pass.getPassNumber());
        dto.setVisitorPassID(pass.getVisitorPassID());
        dto.setStatus(pass.getStatus());
        dto.setDisplayCode(pass.getDisplayCode());
        dto.setOriginLocation(pass.getOriginLocation());
        dto.setOriginStationId(pass.getOriginStationId());

        return dto;
    }

    // ---------- VisitorPassIncident ----------
    public static VisitorPassIncidentDTO toVisitorPassIncidentDTO(VisitorPassIncident incident) {
        if (incident == null) return null;

        VisitorPassIncidentDTO dto = new VisitorPassIncidentDTO();
        dto.setIncidentId(incident.getIncidentId());

        VisitorPass pass = incident.getVisitorPass();
        if (pass != null) {
            dto.setPassId(pass.getPassID());
            dto.setPassDisplayCode(pass.getDisplayCode());
            dto.setPassNumber(pass.getPassNumber());
        }

        Visitor visitor = incident.getVisitor();
        if (visitor != null) {
            dto.setVisitorId(visitor.getVisitorID());
            dto.setVisitorName(visitor.getVisitorName());
        }

        VisitorLog log = incident.getVisitorLog();
        if (log != null) {
            dto.setVisitorLogId(log.getVisitorLogID());
        }

        Station station = incident.getStation();
        if (station != null) {
            dto.setStationId(station.getId());
            dto.setStationName(station.getName());
        }

        UserAccount guard = incident.getReportedBy();
        if (guard != null) {
            dto.setGuardAccountId(guard.getId());
            dto.setGuardName(guard.getUsername());
        }

        dto.setIncidentType(incident.getIncidentType());
        dto.setDescription(incident.getDescription());
        dto.setStatus(incident.getStatus());
        dto.setReportedAt(incident.getReportedAt());
        dto.setResolvedAt(incident.getResolvedAt());
        dto.setResolutionNotes(incident.getResolutionNotes());

        return dto;
    }
}
