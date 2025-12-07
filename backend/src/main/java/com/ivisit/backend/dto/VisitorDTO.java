package com.ivisit.backend.dto;

public class VisitorDTO {
    private Long visitorID;
    private String visitorName;
    private String dateOfBirth;
    private String idNumber;
    private String idType;
    private String visitorType;
    private String gender;
    private String createdAt;
    private String photoPath;
    private Boolean archived;
    private String archivedAt;

    public VisitorDTO() {}

    public VisitorDTO(Long visitorID, String visitorName, String dateOfBirth,
                      String idNumber, String idType, String visitorType,
                      String createdAt, String photoPath) {
        this.visitorID = visitorID;
        this.visitorName = visitorName;
        this.dateOfBirth = dateOfBirth;
        this.idNumber = idNumber;
        this.idType = idType;
        this.visitorType = visitorType;
        this.createdAt = createdAt;
        this.photoPath = photoPath;
    }

    public VisitorDTO(Long visitorID, String visitorName, String dateOfBirth,
                      String idNumber, String idType, String visitorType,
                      String createdAt, String photoPath, String gender) {
        this.visitorID = visitorID;
        this.visitorName = visitorName;
        this.dateOfBirth = dateOfBirth;
        this.idNumber = idNumber;
        this.idType = idType;
        this.visitorType = visitorType;
        this.createdAt = createdAt;
        this.photoPath = photoPath;
        this.gender = gender;
    }

    public Long getVisitorID() { return visitorID; }
    public void setVisitorID(Long visitorID) { this.visitorID = visitorID; }

    public String getVisitorName() { return visitorName; }
    public void setVisitorName(String visitorName) { this.visitorName = visitorName; }

    public String getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(String dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getIdNumber() { return idNumber; }
    public void setIdNumber(String idNumber) { this.idNumber = idNumber; }

    public String getIdType() { return idType; }
    public void setIdType(String idType) { this.idType = idType; }

    public String getVisitorType() { return visitorType; }
    public void setVisitorType(String visitorType) { this.visitorType = visitorType; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getPhotoPath() { return photoPath; }
    public void setPhotoPath(String photoPath) { this.photoPath = photoPath; }

    public Boolean getArchived() { return archived; }
    public void setArchived(Boolean archived) { this.archived = archived; }

    public String getArchivedAt() { return this.archivedAt; }
    public void setArchivedAt(String archivedAt) { this.archivedAt = archivedAt; }
}
