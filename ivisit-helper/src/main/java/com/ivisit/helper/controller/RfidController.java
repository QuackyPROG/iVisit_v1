package com.ivisit.helper.controller;

import com.ivisit.helper.service.RfidService;
import org.springframework.web.bind.annotation.*;
import javax.smartcardio.CardTerminal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


@RestController
@RequestMapping("/api")
public class RfidController {

    private final RfidService service;

    public RfidController(RfidService service) {
        this.service = service;
    }

    @GetMapping("/read-card-uid")
    public ReadResult readCard() {
        try {
            String uid = service.readCardUID(10000); // wait up to 10s
            if (uid == null) return new ReadResult(false, "No card", null);
            return new ReadResult(true, "OK", uid);
        } catch (Exception e) {
            return new ReadResult(false, e.getMessage(), null);
        }
    }

    public static class ReadResult {
        public boolean success;
        public String message;
        public String uid;

        public ReadResult(boolean success, String message, String uid) {
            this.success = success;
            this.message = message;
            this.uid = uid;
        }
    }

    @GetMapping("/scanner-status")
    public Map<String, Object> scannerStatus() {
        Map<String, Object> resp = new HashMap<>();
        try {
            List<CardTerminal> terminals = service.listTerminals();

            if (terminals == null || terminals.isEmpty()) {
                resp.put("ok", false);
                resp.put("message", "No RFID reader detected.");
                return resp;
            }

            resp.put("ok", true);
            resp.put("message", "RFID reader connected.");
            resp.put("readerNames", terminals.stream()
                    .map(CardTerminal::getName)
                    .collect(Collectors.toList()));
            return resp;
        } catch (Exception e) {
            resp.put("ok", false);
            resp.put("message", "RFID scanner error: " + e.getMessage());
            return resp;
        }
    }
}

