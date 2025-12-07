package com.ivisit.backend.dto;

import java.sql.Timestamp;

public class VisitorLogEntryDTO {

    private Long entryId;
    private Long visitorLogId;
    private String visitorName;
    private String visitorType;
    private String stationName;
    private String guardName;
    private String passNo;
    private String timestamp; // ISO string
    private Boolean archived;
    private String archivedAt;

    public VisitorLogEntryDTO() {}

    public Long getEntryId() {
        return entryId;
    }
    public void setEntryId(Long entryId) {
        this.entryId = entryId;
    }

    public Long getVisitorLogId() {
        return visitorLogId;
    }
    public void setVisitorLogId(Long visitorLogId) {
        this.visitorLogId = visitorLogId;
    }

    public String getVisitorName() {
        return visitorName;
    }
    public void setVisitorName(String visitorName) {
        this.visitorName = visitorName;
    }

    public String getVisitorType() {
        return visitorType;
    }
    public void setVisitorType(String visitorType) {
        this.visitorType = visitorType;
    }

    public String getStationName() {
        return stationName;
    }
    public void setStationName(String stationName) {
        this.stationName = stationName;
    }

    public String getGuardName() {
        return guardName;
    }
    public void setGuardName(String guardName) {
        this.guardName = guardName;
    }

    public String getPassNo() {
        return passNo;
    }
    public void setPassNo(String passNo) {
        this.passNo = passNo;
    }

    public String getTimestamp() {
        return timestamp;
    }
    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public Boolean getArchived() {
        return archived;
    }
    public void setArchived(Boolean archived) {
        this.archived = archived;
    }

    public String getArchivedAt() {
        return archivedAt;
    }
    public void setArchivedAt(String archivedAt) {
        this.archivedAt = archivedAt;
    }
}
