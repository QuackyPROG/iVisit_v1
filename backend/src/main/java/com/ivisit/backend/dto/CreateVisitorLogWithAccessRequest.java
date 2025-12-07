// CreateVisitorLogWithAccessRequest.java
package com.ivisit.backend.dto;

import java.util.List;

public class CreateVisitorLogWithAccessRequest {

    private Long visitorId;          // existing visitor
    private Long passId;             // VisitorPass to attach
    private String purposeOfVisit;          // from ScanIdPage "purpose of visit" field
    private List<Long> allowedStationIds;  // IDs of allowed stations

    // Optional: guard & station that created this log (for first entry)
    private Long initialStationId;   // where the check-in happened
    private Long guardAccountId;     // which guard is doing this

    public CreateVisitorLogWithAccessRequest() {}

    public Long getVisitorId() {
        return visitorId;
    }

    public void setVisitorId(Long visitorId) {
        this.visitorId = visitorId;
    }

    public Long getPassId() {
        return passId;
    }

    public void setPassId(Long passId) {
        this.passId = passId;
    }

    public String getPurposeOfVisit() {
        return purposeOfVisit;
    }

    public void setPurposeOfVisit(String purposeOfVisit) {
        this.purposeOfVisit = purposeOfVisit;
    }

    public List<Long> getAllowedStationIds() {
        return allowedStationIds;
    }

    public void setAllowedStationIds(List<Long> allowedStationIds) {
        this.allowedStationIds = allowedStationIds;
    }

    public Long getInitialStationId() {
        return initialStationId;
    }

    public void setInitialStationId(Long initialStationId) {
        this.initialStationId = initialStationId;
    }

    public Long getGuardAccountId() {
        return guardAccountId;
    }

    public void setGuardAccountId(Long guardAccountId) {
        this.guardAccountId = guardAccountId;
    }
}
