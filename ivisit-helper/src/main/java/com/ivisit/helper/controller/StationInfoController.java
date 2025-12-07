package com.ivisit.helper.controller;

import com.ivisit.helper.config.StationConfigService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/station")
public class StationInfoController {

    private final StationConfigService stationConfigService;

    public StationInfoController(StationConfigService stationConfigService) {
        this.stationConfigService = stationConfigService;
    }

    @GetMapping
    public Map<String, Object> getStationInfo() {
        Map<String, Object> info = new HashMap<>();
        info.put("stationId", stationConfigService.getStationId());
        return info;
    }

    @PostMapping
    public ResponseEntity<?> updateStation(@RequestBody StationUpdateRequest request) {
        if (request == null || request.getStationId() == null) {
            return ResponseEntity
                    .badRequest()
                    .body(error("stationId is required"));
        }

        int id = request.getStationId();
        if (id <= 0) {
            return ResponseEntity
                    .badRequest()
                    .body(error("stationId must be a positive integer"));
        }

        try {
            stationConfigService.setStationId(id);
        } catch (IOException e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(error("Failed to save station config: " + e.getMessage()));
        }

        Map<String, Object> body = new HashMap<>();
        body.put("stationId", id);
        body.put("message", "Station updated");
        return ResponseEntity.ok(body);
    }

    // Simple request DTO
    public static class StationUpdateRequest {
        private Integer stationId;

        public Integer getStationId() {
            return stationId;
        }

        public void setStationId(Integer stationId) {
            this.stationId = stationId;
        }
    }

    private Map<String, String> error(String msg) {
        Map<String, String> m = new HashMap<>();
        m.put("error", msg);
        return m;
    }
}
