package com.ivisit.backend.dto;

public class UpdateVisitorPassRequest {

    private String displayCode;
    private String originLocation;
    private String visitorPassID;
    private Long originStationId;

    public String getDisplayCode() {
        return displayCode;
    }

    public void setDisplayCode(String displayCode) {
        this.displayCode = displayCode;
    }

    public String getOriginLocation() {
        return originLocation;
    }

    public void setOriginLocation(String originLocation) {
        this.originLocation = originLocation;
    }

    public String getVisitorPassID() {
        return visitorPassID;
    }

    public void setVisitorPassID(String visitorPassID) {
        this.visitorPassID = visitorPassID;
    }

    public Long getOriginStationId() {
        return originStationId;
    }

    public void setOriginStationId(Long originStationId) {
        this.originStationId = originStationId;
    }
}
