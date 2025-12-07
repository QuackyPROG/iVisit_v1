package com.ivisit.backend.controller;

import com.ivisit.backend.dto.RfidScanRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/helper")
public class HelperRfidController {

    private static final Logger log = LoggerFactory.getLogger(HelperRfidController.class);

    @PostMapping("/rfid-scan")
    public ResponseEntity<?> handleRfidScan(@RequestBody RfidScanRequest request) {
        // For now: log the incoming data so we know RFID -> backend works
        log.info("RFID scan received: uid={}, stationId={}, scannedAt={}",
                request.getUid(), request.getStationId(), request.getScannedAt());


        return ResponseEntity.ok().build();
    }
}
