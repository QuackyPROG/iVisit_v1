package com.ivisit.backend.dto;

import java.util.List;

public class StationGuardUpdateRequest {
    private List<Long> guardIds;

    public StationGuardUpdateRequest() {}

    public List<Long> getGuardIds() {
        return guardIds;
    }

    public void setGuardIds(List<Long> guardIds) {
        this.guardIds = guardIds;
    }
}
