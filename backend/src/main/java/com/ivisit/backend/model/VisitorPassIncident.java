package com.ivisit.backend.model;

import javax.persistence.*;
import java.sql.Timestamp;

@Entity
public class VisitorPassIncident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long incidentId;

    // Which pass the incident is about (required)
    @ManyToOne
    @JoinColumn(name = "visitor_pass_id", nullable = false)
    private VisitorPass visitorPass;

    // Which visitor (optional – in case you only know the pass)
    @ManyToOne
    @JoinColumn(name = "visitor_id")
    private Visitor visitor;

    // Which log/session (optional – but ideal if there is an active log)
    @ManyToOne
    @JoinColumn(name = "visitor_log_id")
    private VisitorLog visitorLog;

    // Where it was reported (Gate 1, Lobby, etc.)
    @ManyToOne
    @JoinColumn(name = "station_id")
    private Station station;

    // Guard who reported it
    @ManyToOne
    @JoinColumn(name = "reported_by_account_id")
    private UserAccount reportedBy;

    // LOST, DAMAGED, NOT_RETURNED, OTHER
    private String incidentType;

    @Column(length = 1000)
    private String description;

    // Status: OPEN, CLOSED
    private String status;

    private Timestamp reportedAt;
    private Timestamp resolvedAt;

    @Column(length = 1000)
    private String resolutionNotes;

    public VisitorPassIncident() {
    }

    // Getters & setters

    public Long getIncidentId() {
        return incidentId;
    }
    public void setIncidentId(Long incidentId) {
        this.incidentId = incidentId;
    }

    public VisitorPass getVisitorPass() {
        return visitorPass;
    }
    public void setVisitorPass(VisitorPass visitorPass) {
        this.visitorPass = visitorPass;
    }

    public Visitor getVisitor() {
        return visitor;
    }
    public void setVisitor(Visitor visitor) {
        this.visitor = visitor;
    }

    public VisitorLog getVisitorLog() {
        return visitorLog;
    }
    public void setVisitorLog(VisitorLog visitorLog) {
        this.visitorLog = visitorLog;
    }

    public Station getStation() {
        return station;
    }
    public void setStation(Station station) {
        this.station = station;
    }

    public UserAccount getReportedBy() {
        return reportedBy;
    }
    public void setReportedBy(UserAccount reportedBy) {
        this.reportedBy = reportedBy;
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
