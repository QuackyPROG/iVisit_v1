package com.ivisit.backend.model;

import javax.persistence.*;

@Entity
public class VisitorPass {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long passID;

    // e.g. 865A4BA6 converted from Hex (RFID UID)
    @Column(unique = true)
    private String passNumber;

    // Link to external RFID DB (if ever used)
    private String visitorPassID;

    // e.g., "AVAILABLE", "IN_USE", "LOST", "INACTIVE", "RETIRED"
    private String status;

    // e.g., "032" printed on the card
    private String displayCode;

    // Optional human-readable label like "Main Gate"
    private String originLocation;

    // The ID of the Station this pass belongs to (no @ManyToOne, just the ID)
    private Long originStationId;

    public VisitorPass() {
    }

    public VisitorPass(String passNumber, String visitorPassID, String status) {
        this.passNumber = passNumber;
        this.visitorPassID = visitorPassID;
        this.status = status;
    }

    public Long getPassID() {
        return passID;
    }
    public void setPassID(Long passID) {
        this.passID = passID;
    }

    public String getPassNumber() {
        return passNumber;
    }
    public void setPassNumber(String passNumber) {
        this.passNumber = passNumber;
    }

    public String getVisitorPassID() {
        return visitorPassID;
    }
    public void setVisitorPassID(String visitorPassID) {
        this.visitorPassID = visitorPassID;
    }

    public String getStatus() {
        return status;
    }
    public void setStatus(String status) {
        this.status = status;
    }

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

    public Long getOriginStationId() {
        return originStationId;
    }
    public void setOriginStationId(Long originStationId) {
        this.originStationId = originStationId;
    }
}
