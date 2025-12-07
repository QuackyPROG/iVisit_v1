package com.ivisit.backend.model;

import javax.persistence.*;
import java.sql.Timestamp;
import java.util.List;

@Entity
public class VisitorLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long visitorLogID;

    @ManyToOne
    @JoinColumn(name = "visitorID", nullable = false)
    private Visitor visitor;

    @ManyToOne
    @JoinColumn(name = "passID", nullable = true)
    private VisitorPass visitorPass;

    private Timestamp activeStart;
    private Timestamp activeEnd;

    private String purposeOfVisit;

    @ManyToMany
    @JoinTable(
            name = "visitor_log_allowed_station",
            joinColumns = @JoinColumn(name = "visitor_log_id"),
            inverseJoinColumns = @JoinColumn(name = "station_id")
    )
    private List<Station> allowedStations;

    private Boolean archived;
    private Timestamp archivedAt;

    @OneToMany(mappedBy = "visitorLog", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VisitorLogEntry> visitorLogEntries;

    public VisitorLog() {}

    public VisitorLog(Visitor visitor, VisitorPass visitorPass, Timestamp activeStart, Timestamp activeEnd) {
        this.visitor = visitor;
        this.visitorPass = visitorPass;
        this.activeStart = activeStart;
        this.activeEnd = activeEnd;
    }

    // Getters and setters
    public Long getVisitorLogID() {
        return visitorLogID;
    }
    public void setVisitorLogID(Long visitorLogID) {
        this.visitorLogID = visitorLogID;
    }

    public Visitor getVisitor() {
        return visitor;
    }
    public void setVisitor(Visitor visitor) {
        this.visitor = visitor;
    }

    public VisitorPass getVisitorPass() {
        return visitorPass;
    }
    public void setVisitorPass(VisitorPass visitorPass) {
        this.visitorPass = visitorPass;
    }

    public Timestamp getActiveStart() {
        return activeStart;
    }
    public void setActiveStart(Timestamp activeStart) {
        this.activeStart = activeStart;
    }

    public Timestamp getActiveEnd() {
        return activeEnd;
    }
    public void setActiveEnd(Timestamp activeEnd) {
        this.activeEnd = activeEnd;
    }

    public List<VisitorLogEntry> getVisitorLogEntries() {
        return visitorLogEntries;
    }
    public void setVisitorLogEntries(List<VisitorLogEntry> visitorLogEntries) {
        this.visitorLogEntries = visitorLogEntries;
    }

    public String getPurposeOfVisit() {
        return purposeOfVisit;
    }
    public void setPurposeOfVisit(String purposeOfVisit) {
        this.purposeOfVisit = purposeOfVisit;
    }

    public List<Station> getAllowedStations() {
        return allowedStations;
    }
    public void setAllowedStations(List<Station> allowedStations) {
        this.allowedStations = allowedStations;
    }

    public Boolean getArchived() {
        return archived;
    }
    public void setArchived(Boolean archived) {
        this.archived = archived;
    }

    public Timestamp getArchivedAt() {
        return archivedAt;
    }
    public void setArchivedAt(Timestamp archivedAt) {
        this.archivedAt = archivedAt;
    }
}
