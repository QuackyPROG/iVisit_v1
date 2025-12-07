package com.ivisit.backend.model;

import javax.persistence.*;
import java.util.List;

@Entity
public class Station {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long stationID;

    @Column(unique = true)
    private String stationName;

    private String stationType; // GATE, BUILDING

    private Boolean active = true;

    @OneToMany(mappedBy = "station", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VisitorLogEntry> visitorLogEntries;

    @ManyToMany(mappedBy = "assignedStations")
    private List<UserAccount> assignedUsers;

    // Constructors, getters, and setters

    public Station() {}

    public Station(String name, String type, Boolean active) {
        this.stationName = name;
        this.stationType = type;
        this.active = active;
    }

    public Long getId() {
        return stationID;
    }
    public void setId(Long id) {
        this.stationID = id;
    }

    public String getName() {
        return stationName;
    }
    public void setName(String name) {
        this.stationName = name;
    }

    public String getType() {
        return stationType;
    }
    public void setType(String type) {
        this.stationType = type;
    }

    public Boolean getActive() {
        return active;
    }
    public void setActive(Boolean active) {
        this.active = active;
    }

    public List<VisitorLogEntry> getVisitorLogEntries() {
        return visitorLogEntries;
    }
    public void setVisitorLogs(List<VisitorLogEntry> visitorLogs) {
        this.visitorLogEntries = visitorLogs;
    }

    public List<UserAccount> getAssignedUsers() {
        return assignedUsers;
    }
    public void setAssignedUsers(List<UserAccount> assignedUsers) {
        this.assignedUsers = assignedUsers;
    }
}
