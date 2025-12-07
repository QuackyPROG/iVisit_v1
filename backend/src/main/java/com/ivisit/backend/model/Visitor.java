package com.ivisit.backend.model;

import javax.persistence.*;
import java.sql.Timestamp;
import java.util.Date;

@Entity
public class Visitor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long visitorID;

    private String visitorName;
    private String visitorType;
    private String gender;
    private String idType;
    private String idNumber;

    @Temporal(TemporalType.DATE)
    private Date dateOfBirth;

    private Timestamp createdAt;

    private Boolean archived;
    private Timestamp archivedAt;

    private String photoPath;
    private String idImagePath;

    public Visitor() {}

    public Visitor(String visitorName, String visitorType, String idType, String idNumber, Date dateOfBirth, Timestamp createdAt) {
        this.visitorName = visitorName;
        this.visitorType = visitorType;
        this.idType = idType;
        this.idNumber = idNumber;
        this.dateOfBirth = dateOfBirth;
        this.createdAt = createdAt;
    }

    // Getters and setters
    public Long getVisitorID() {
        return visitorID;
    }
    public void setVisitorID(Long visitorID) {
        this.visitorID = visitorID;
    }

    public String getVisitorName() {
        return visitorName;
    }
    public void setVisitorName(String visitorName) {
        this.visitorName = visitorName;
    }

    public String getVisitorType() {
        return visitorType;
    }
    public void setVisitorType(String visitorType) {
        this.visitorType = visitorType;
    }

    public String getGender() {
        return gender;
    }
    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getIdType() {
        return idType;
    }
    public void setIdType(String idType) {
        this.idType = idType;
    }

    public String getIdNumber() {
        return idNumber;
    }
    public void setIdNumber(String idNumber) {
        this.idNumber = idNumber;
    }

    public Date getDateOfBirth() {
        return dateOfBirth;
    }
    public void setDateOfBirth(Date dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public Timestamp getCreatedAt() {
        return createdAt;
    }
    public void setCreatedAt(Timestamp createdAt) {
        this.createdAt = createdAt;
    }

    public String getPhotoPath() {
        return photoPath;
    }
    public void setPhotoPath(String photoPath) {
        this.photoPath = photoPath;
    }

    public String getIdImagePath() {
        return idImagePath;
    }
    public void setIdImagePath(String idImagePath) {
        this.idImagePath = idImagePath;
    }

    public Boolean getArchived() { return archived; }
    public void setArchived(Boolean archived) { this.archived = archived; }

    public Timestamp getArchivedAt() {
        return archivedAt;
    }
    public void setArchivedAt(Timestamp archivedAt) {
        this.archivedAt = archivedAt;
    }
}
