package com.ivisit.backend.dto;

public class TwoFactorVerifyRequest {
    private Long userId;
    private Integer code;
    private Long stationId; // optional, to carry forward guard station binding

    public TwoFactorVerifyRequest() {}

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Integer getCode() {
        return code;
    }

    public void setCode(Integer code) {
        this.code = code;
    }

    public Long getStationId() {
        return stationId;
    }

    public void setStationId(Long stationId) {
        this.stationId = stationId;
    }
}
