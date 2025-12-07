package com.ivisit.backend.dto;

public class VisitorRegistrationResponse {
    private String message;
    private Long visitorId;
    private String idImagePath;
    private String personPhotoPath;
    private String timestamp;

    public VisitorRegistrationResponse() {}

    public VisitorRegistrationResponse(String message, Long visitorId, String idImagePath, String personPhotoPath, String timestamp) {
        this.message = message;
        this.visitorId = visitorId;
        this.idImagePath = idImagePath;
        this.personPhotoPath = personPhotoPath;
        this.timestamp = timestamp;
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Long getVisitorId() { return visitorId; }
    public void setVisitorId(Long visitorId) { this.visitorId = visitorId; }

    public String getIdImagePath() { return idImagePath; }
    public void setIdImagePath(String idImagePath) { this.idImagePath = idImagePath; }

    public String getPersonPhotoPath() { return personPhotoPath; }
    public void setPersonPhotoPath(String personPhotoPath) { this.personPhotoPath = personPhotoPath; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
}
