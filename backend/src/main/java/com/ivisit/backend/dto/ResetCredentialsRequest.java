// src/main/java/com/ivisit/backend/dto/ResetCredentialsRequest.java
package com.ivisit.backend.dto;

public class ResetCredentialsRequest {
    private String newPassword;

    public ResetCredentialsRequest() {}

    public String getNewPassword() {
        return newPassword;
    }

    public void setNewPassword(String newPassword) {
        this.newPassword = newPassword;
    }
}
