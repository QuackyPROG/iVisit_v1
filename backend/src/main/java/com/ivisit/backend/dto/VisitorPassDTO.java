package com.ivisit.backend.dto;

public class VisitorPassDTO {
    private Long passID;
    private String passNumber;
    private String visitorPassID;
    private String status;
    private String displayCode;
    private String originLocation; //techncially deprecated...
    private Long originStationId;

    public VisitorPassDTO() {}

    public VisitorPassDTO(Long passID, String passNumber, String visitorPassID, String status,
                          String displayCode, String originLocation, Long originStationId) {
        this.passID = passID;
        this.passNumber = passNumber;
        this.visitorPassID = visitorPassID;
        this.status = status;
        this.displayCode = displayCode;
        this.originLocation = originLocation;
        this.originStationId = originStationId;
    }

    public Long getPassID() { return passID; }
    public void setPassID(Long passID) { this.passID = passID; }

    public String getPassNumber() { return passNumber; }
    public void setPassNumber(String passNumber) { this.passNumber = passNumber; }

    public String getVisitorPassID() { return visitorPassID; }
    public void setVisitorPassID(String visitorPassID) { this.visitorPassID = visitorPassID; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDisplayCode() { return displayCode; }
    public void setDisplayCode(String displayCode) { this.displayCode = displayCode; }

    public String getOriginLocation() { return originLocation; }
    public void setOriginLocation(String originLocation) { this.originLocation = originLocation; }

    public Long getOriginStationId() {
        return originStationId;
    }
    public void setOriginStationId(Long originStationId) {
        this.originStationId = originStationId;
    }
}
