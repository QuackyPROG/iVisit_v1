package com.ivisit.backend.dto;

import java.sql.Timestamp;

public class VisitorPassIncidentDTO {

    private Long incidentId;

    private Long passId;
    private String passDisplayCode;
    private String passNumber;

    private Long visitorId;
    private String visitorName;

    private Long visitorLogId;

    private Long stationId;
    private String stationName;

    private Long guardAccountId;
    private String guardName;

    private String incidentType;
    private String description;

    private String status; // OPEN / CLOSED
    private Timestamp reportedAt;
    private Timestamp resolvedAt;
    private String resolutionNotes;

    public VisitorPassIncidentDTO() {
    }

    public Long getIncidentId() {
        return incidentId;
    }

    public void setIncidentId(Long incidentId) {
        this.incidentId = incidentId;
    }

    public Long getPassId() {
        return passId;
    }

    public void setPassId(Long passId) {
        this.passId = passId;
    }

    public String getPassDisplayCode() {
        return passDisplayCode;
    }

    public void setPassDisplayCode(String passDisplayCode) {
        this.passDisplayCode = passDisplayCode;
    }

    public String getPassNumber() {
        return passNumber;
    }

    public void setPassNumber(String passNumber) {
        this.passNumber = passNumber;
    }

    public Long getVisitorId() {
        return visitorId;
    }

    public void setVisitorId(Long visitorId) {
        this.visitorId = visitorId;
    }

    public String getVisitorName() {
        return visitorName;
    }

    public void setVisitorName(String visitorName) {
        this.visitorName = visitorName;
    }

    public Long getVisitorLogId() {
        return visitorLogId;
    }

    public void setVisitorLogId(Long visitorLogId) {
        this.visitorLogId = visitorLogId;
    }

    public Long getStationId() {
        return stationId;
    }

    public void setStationId(Long stationId) {
        this.stationId = stationId;
    }

    public String getStationName() {
        return stationName;
    }

    public void setStationName(String stationName) {
        this.stationName = stationName;
    }

    public Long getGuardAccountId() {
        return guardAccountId;
    }

    public void setGuardAccountId(Long guardAccountId) {
        this.guardAccountId = guardAccountId;
    }

    public String getGuardName() {
        return guardName;
    }

    public void setGuardName(String guardName) {
        this.guardName = guardName;
    }

    public String getIncidentType() {
        return incidentType;
    }

    public void setIncidentType(String incidentType) {
        this.incidentType = incidentType;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Timestamp getReportedAt() {
        return reportedAt;
    }

    public void setReportedAt(Timestamp reportedAt) {
        this.reportedAt = reportedAt;
    }

    public Timestamp getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(Timestamp resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public String getResolutionNotes() {
        return resolutionNotes;
    }

    public void setResolutionNotes(String resolutionNotes) {
        this.resolutionNotes = resolutionNotes;
    }
}
