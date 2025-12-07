package com.ivisit.backend.controller;

import com.ivisit.backend.dto.RfidScanRequest;
import com.ivisit.backend.dto.UpdateVisitorPassRequest;
import com.ivisit.backend.dto.VisitorPassDTO;
import com.ivisit.backend.mapper.EntityDtoMapper;
import com.ivisit.backend.model.VisitorPass;
import com.ivisit.backend.service.VisitorPassService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/visitorPass")
public class VisitorPassController {

    @Autowired
    private VisitorPassService visitorPassService;

    @GetMapping
    public ResponseEntity<List<VisitorPassDTO>> getAllPasses() {
        List<VisitorPass> passes = visitorPassService.getAllPasses();
        List<VisitorPassDTO> dtos = passes.stream()
                .map(EntityDtoMapper::toVisitorPassDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/available")
    public ResponseEntity<List<VisitorPassDTO>> getAvailablePasses() {
        List<VisitorPass> passes = visitorPassService.getAvailablePasses();
        List<VisitorPassDTO> dtos = passes.stream()
                .map(EntityDtoMapper::toVisitorPassDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping
    public ResponseEntity<VisitorPassDTO> createPass(
            @RequestParam("passNumber") String passNumber,
            @RequestParam(value = "visitorPassID", required = false) String visitorPassID,
            @RequestParam(value = "status", defaultValue = "AVAILABLE") String status
    ) {
        VisitorPass pass = visitorPassService.createPass(passNumber, visitorPassID, status);
        VisitorPassDTO dto = EntityDtoMapper.toVisitorPassDTO(pass);
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/{passId}/status")
    public ResponseEntity<?> updatePassStatus(
            @PathVariable Long passId,
            @RequestParam("status") String status
    ) {
        try {
            VisitorPass pass = visitorPassService.updatePassStatus(passId, status);
            VisitorPassDTO dto = EntityDtoMapper.toVisitorPassDTO(pass);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{passId}")
    public ResponseEntity<?> updatePass(
            @PathVariable Long passId,
            @RequestBody UpdateVisitorPassRequest request
    ) {
        try {
            VisitorPass pass = visitorPassService.updatePassMetadata(
                    passId,
                    request.getDisplayCode(),
                    request.getOriginLocation(),
                    request.getVisitorPassID(),
                    request.getOriginStationId()
            );
            VisitorPassDTO dto = EntityDtoMapper.toVisitorPassDTO(pass);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{passId}")
    public ResponseEntity<?> deletePass(@PathVariable Long passId) {
        try {
            visitorPassService.deletePass(passId);
            return ResponseEntity.ok("Visitor pass deleted successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/by-uid/{uid}")
    public ResponseEntity<?> getPassByUid(@PathVariable("uid") String uid) {
        Optional<VisitorPass> opt = visitorPassService.findByUid(uid);

        if (!opt.isPresent()) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body("No visitor pass linked to UID: " + uid);
        }

        VisitorPass pass = opt.get();
        String rawStatus = pass.getStatus();
        String status = rawStatus != null ? rawStatus.trim().toUpperCase() : "AVAILABLE";

        // Treat terminal statuses as unusable at the reader
        if ("LOST".equals(status) || "INACTIVE".equals(status) || "RETIRED".equals(status)) {
            String label = pass.getDisplayCode() != null && !pass.getDisplayCode().isEmpty()
                    ? pass.getDisplayCode()
                    : (pass.getPassNumber() != null && !pass.getPassNumber().isEmpty()
                    ? pass.getPassNumber()
                    : ("#" + pass.getPassID()));

            String message = "Pass " + label + " is marked as " + status + " and cannot be used.";

            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(message);
        }

        VisitorPassDTO dto = EntityDtoMapper.toVisitorPassDTO(pass);
        return ResponseEntity.ok(dto);
    }
}
