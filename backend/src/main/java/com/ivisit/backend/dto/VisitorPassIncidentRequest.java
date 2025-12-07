package com.ivisit.backend.dto;

public class VisitorPassIncidentRequest {

    private Long passId;          // required
    private Long visitorId;       // optional
    private Long visitorLogId;    // optional

    private Long stationId;       // where it was reported
    private Long guardAccountId;  // who reported it

    // LOST, DAMAGED, NOT_RETURNED, OTHER
    private String incidentType;

    // Free-text explanation of how/why it happened
    private String description;

    public Long getPassId() {
        return passId;
    }

    public void setPassId(Long passId) {
        this.passId = passId;
    }

    public Long getVisitorId() {
        return visitorId;
    }

    public void setVisitorId(Long visitorId) {
        this.visitorId = visitorId;
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

    public Long getGuardAccountId() {
        return guardAccountId;
    }

    public void setGuardAccountId(Long guardAccountId) {
        this.guardAccountId = guardAccountId;
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
}
