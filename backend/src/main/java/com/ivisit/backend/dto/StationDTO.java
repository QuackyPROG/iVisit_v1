package com.ivisit.backend.dto;

public class StationDTO {
    private Long stationID;
    private String stationName;
    private String stationType;
    private Boolean active;

    public StationDTO() {}

    public StationDTO(Long stationID, String stationName, String stationType, Boolean active) {
        this.stationID = stationID;
        this.stationName = stationName;
        this.stationType = stationType;
        this.active = active;
    }

    public Long getStationID() {
        return stationID;
    }
    public void setStationID(Long stationID) {
        this.stationID = stationID;
    }

    public String getStationName() {
        return stationName;
    }
    public void setStationName(String stationName) {
        this.stationName = stationName;
    }

    public String getStationType() {
        return stationType;
    }
    public void setStationType(String stationType) {
        this.stationType = stationType;
    }

    public Boolean getActive() {
        return active;
    }
    public void setActive(Boolean active) {
        this.active = active;
    }
}

