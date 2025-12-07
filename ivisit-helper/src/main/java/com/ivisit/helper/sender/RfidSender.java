package com.ivisit.helper.sender;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Component
public class RfidSender {

    private final RestTemplate restTemplate;
    private final String backendUrl;
    private final String stationId;

    public RfidSender(
            RestTemplate restTemplate,
            @Value("${backend.url}") String backendUrl,
            @Value("${station.id}") String stationId
    ) {
        this.restTemplate = restTemplate;
        this.backendUrl = backendUrl;
        this.stationId = stationId;
    }

    public void sendScan(String uid) {
        String url = backendUrl + "/api/helper/rfid-scan";

        Map<String, Object> body = new HashMap<>();
        body.put("uid", uid);
        body.put("stationId", stationId);
        body.put("scannedAt", Instant.now().toString());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            System.out.println("Sent RFID scan to backend: HTTP " + response.getStatusCodeValue());
        } catch (Exception e) {
            System.err.println("Failed to send RFID scan: " + e.getMessage());
        }
    }
}
