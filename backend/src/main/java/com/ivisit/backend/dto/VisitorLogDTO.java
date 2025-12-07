package com.ivisit.backend.dto;

import java.security.Timestamp;
import java.util.List;

public class VisitorLogDTO {
    private Long visitorLogID;
    private Long visitorID;
    private String fullName;
    private String idType;
    private String passNo;
    private String location; // technically the last location
    private String firstLocation;
    private String purposeOfVisit;
    private String loggedBy;
    private String date; // yyyy-MM-dd
    private String time; // HH:mm:ss
    private Boolean archived;
    private String archivedAt;

    private List<String> allowedStations;

    public VisitorLogDTO() {}

    public VisitorLogDTO(Long visitorLogID, String fullName, String idType, String passNo,
                         String location, String firstLocation,String purposeOfVisit, String loggedBy,
                         String date, String time, List<String> allowedStations) {
        this.visitorLogID = visitorLogID;
        this.fullName = fullName;
        this.idType = idType;
        this.passNo = passNo;
        this.location = location;
        this.firstLocation = firstLocation;
        this.purposeOfVisit = purposeOfVisit;
        this.loggedBy = loggedBy;
        this.date = date;
        this.time = time;
        this.allowedStations = allowedStations;
    }

    public Long getVisitorLogID() {
        return visitorLogID;
    }
    public void setVisitorLogID(Long visitorLogID) {
        this.visitorLogID = visitorLogID;
    }

    public Long getVisitorID() {
        return visitorID;
    }
    public void setVisitorID(Long visitorID) {
        this.visitorID = visitorID;
    }

    public String getFullName() {
        return fullName;
    }
    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getIdType() {
        return idType;
    }
    public void setIdType(String idType) {
        this.idType = idType;
    }

    public String getPassNo() {
        return passNo;
    }
    public void setPassNo(String passNo) {
        this.passNo = passNo;
    }

    public String getLocation() {
        return location;
    }
    public void setLocation(String location) {
        this.location = location;
    }

    public String getFirstLocation() {
        return firstLocation;
    }
    public void setFirstLocation(String firstLocation) {
        this.firstLocation = firstLocation;
    }

    public String getPurposeOfVisit() {
        return purposeOfVisit;
    }
    public void setPurposeOfVisit(String purposeOfVisit) {
        this.purposeOfVisit = purposeOfVisit;
    }

    public String getLoggedBy() {
        return loggedBy;
    }
    public void setLoggedBy(String loggedBy) {
        this.loggedBy = loggedBy;
    }

    public String getDate() {
        return date;
    }
    public void setDate(String date) {
        this.date = date;
    }

    public String getTime() {
        return time;
    }
    public void setTime(String time) {
        this.time = time;
    }

    public List<String> getAllowedStations() {
        return allowedStations;
    }
    public void setAllowedStations(List<String> allowedStations) {
        this.allowedStations = allowedStations;
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
