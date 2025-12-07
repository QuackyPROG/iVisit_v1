package com.ivisit.backend.dto;

import javax.validation.constraints.Email;
import javax.validation.constraints.NotBlank;
import java.sql.Timestamp;
import java.util.List;

public class UserAccountDTO {
    private Long accountID;
    private String username;
    private String emailAddress;
    private String accountType;
    private List<Long> assignedStationIds; // only IDs to keep it light
    private Boolean active;

    private Timestamp createdAt;

    private Boolean emailVerified;
    private Timestamp emailVerifiedAt;

    public UserAccountDTO() {}

    public UserAccountDTO(Long accountID, String username, String emailAddress,
                          String accountType, List<Long> assignedStationIds) {
        this.accountID = accountID;
        this.username = username;
        this.emailAddress = emailAddress;
        this.accountType = accountType;
        this.assignedStationIds = assignedStationIds;
    }

    public Long getAccountID() {
        return accountID;
    }
    public void setAccountID(Long accountID) {
        this.accountID = accountID;
    }

    public String getUsername() {
        return username;
    }
    public void setUsername(String username) {
        this.username = username;
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

    public List<Long> getAssignedStationIds() {
        return assignedStationIds;
    }
    public void setAssignedStationIds(List<Long> assignedStationIds) {
        this.assignedStationIds = assignedStationIds;
    }

    public Boolean getActive() {
        return active;
    }
    public void setActive(Boolean active) {
        this.active = active;
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
