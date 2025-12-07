package com.ivisit.backend.model;

import javax.persistence.*;
import java.sql.Timestamp;

@Entity
public class VisitorLogEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long visitorLogEntryID;

    @ManyToOne
    @JoinColumn(name = "visitorLogID", nullable = false)
    private VisitorLog visitorLog;

    @ManyToOne
    @JoinColumn(name = "stationID", nullable = false)
    private Station station;

    @ManyToOne
    @JoinColumn(name = "accountID", nullable = false)
    private UserAccount userAccount;

    private Timestamp timestamp;

    private Boolean archived;
    private Timestamp archivedAt;

    public VisitorLogEntry() {}

    public VisitorLogEntry(VisitorLog visitorLog, Station station, UserAccount userAccount, Timestamp timestamp) {
        this.visitorLog = visitorLog;
        this.station = station;
        this.userAccount = userAccount;
        this.timestamp = timestamp;
    }

    public Long getVisitorLogEntryID() {
        return visitorLogEntryID;
    }
    public void setVisitorLogEntryID(Long visitorLogEntryID) {
        this.visitorLogEntryID = visitorLogEntryID;
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

    public UserAccount getUserAccount() {
        return userAccount;
    }
    public void setUserAccount(UserAccount userAccount) {
        this.userAccount = userAccount;
    }

    public Timestamp getTimestamp() {
        return timestamp;
    }
    public void setTimestamp(Timestamp timestamp) {
        this.timestamp = timestamp;
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
