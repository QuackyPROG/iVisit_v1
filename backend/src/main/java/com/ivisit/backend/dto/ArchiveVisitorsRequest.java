package com.ivisit.backend.dto;

import java.util.List;

public class ArchiveVisitorsRequest {
    private List<Long> visitorIds;

    public ArchiveVisitorsRequest() {}

    public List<Long> getVisitorIds() {
        return visitorIds;
    }

    public void setVisitorIds(List<Long> visitorIds) {
        this.visitorIds = visitorIds;
    }
}
