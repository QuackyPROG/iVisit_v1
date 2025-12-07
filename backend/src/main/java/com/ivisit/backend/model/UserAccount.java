package com.ivisit.backend.model;

import javax.persistence.*;
import java.sql.Timestamp;
import java.util.List;

@Entity
public class UserAccount {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long accountID;
    private String username;
    private String password;
    private String emailAddress;
    private String accountType; // e.g., "guard", "admin", "support"
    private Boolean active; // null = treated as active ??

    // 2FA related
    private String totpSecret;
    private Boolean twoFactorEnabled;

    @ManyToMany
    @JoinTable(
            name = "user_station_link", // name of the join (link) table
            joinColumns = @JoinColumn(name = "user_id"), // foreign key from UserAccount
            inverseJoinColumns = @JoinColumn(name = "station_id") // foreign key from Station
    )
    private List<Station> assignedStations;

    private Timestamp createdAt;

    private Boolean emailVerified;
    private Timestamp emailVerifiedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = new Timestamp(System.currentTimeMillis());
        }
    }

    // Constructors, getters, and setters
    public UserAccount() {}

    public UserAccount(String username, String password, String emailAddress, String accountType, List<Station> assignedStations) {
        this.username = username;
        this.password = password;
        this.emailAddress = emailAddress;
        this.accountType = accountType;
        this.assignedStations = assignedStations;

    }

    public Long getId() {
        return accountID;
    }
    public void setId(Long id) {
        this.accountID = id;
    }

    public String getUsername() {
        return username;
    }
    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }
    public void setPassword(String password) {
        this.password = password;
    }

    public String getEmailAddress() {
        return emailAddress;
    }
    public void setEmailAddress(String emailAddress) {
        this.emailAddress = emailAddress;
    }

    public String getAccountType() {
        return accountType;
    }
    public void setAccountType(String accountType) {
        this.accountType = accountType;
    }

    public Boolean getActive() {
        return active;
    }
    public void setActive(Boolean active) {
        this.active = active;
    }

    public List<Station> getAssignedStations() {
        return assignedStations;
    }
    public void setAssignedStations(List<Station> assignedStations) {
        this.assignedStations = assignedStations;
    }

    public String getTotpSecret() {
        return totpSecret;
    }
    public void setTotpSecret(String totpSecret) {
        this.totpSecret = totpSecret;
    }

    public Boolean getTwoFactorEnabled() {
        return twoFactorEnabled;
    }
    public void setTwoFactorEnabled(Boolean twoFactorEnabled) {
        this.twoFactorEnabled = twoFactorEnabled;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }
    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }

    public Boolean getEmailVerified() {
        return emailVerified;
    }
    public void setEmailVerified(Boolean emailVerified) {
        this.emailVerified = emailVerified;
    }

    public Timestamp getEmailVerifiedAt() {
        return emailVerifiedAt;
    }
    public void setEmailVerifiedAt(Timestamp emailVerifiedAt) {
        this.emailVerifiedAt = emailVerifiedAt;
    }
}
