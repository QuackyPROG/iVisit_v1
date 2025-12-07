package com.ivisit.backend.dto;

public class RfidScanRequest {

    private String uid;
    private String stationId;
    private String scannedAt; // ISO string for now

    public String getUid() {
        return uid;
    }

    public void setUid(String uid) {
        this.uid = uid;
    }

    public String getStationId() {
        return stationId;
    }

    public void setStationId(String stationId) {
        this.stationId = stationId;
    }

    public String getScannedAt() {
        return scannedAt;
    }

    public void setScannedAt(String scannedAt) {
        this.scannedAt = scannedAt;
    }
}
