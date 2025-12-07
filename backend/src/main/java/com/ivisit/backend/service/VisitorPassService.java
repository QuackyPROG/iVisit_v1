package com.ivisit.backend.service;

import com.ivisit.backend.model.VisitorPass;
import com.ivisit.backend.repository.VisitorPassRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class VisitorPassService {

    @Autowired
    private VisitorPassRepository visitorPassRepository;

    // Allowed statuses for safety
    private static final Set<String> ALLOWED_STATUSES = new HashSet<>(
            Arrays.asList("AVAILABLE", "IN_USE", "LOST", "INACTIVE", "RETIRED")
    );

    /**
     * Create a new visitor pass.
     */
    public VisitorPass createPass(String passNumber, String visitorPassID, String status) {
        if (passNumber == null || passNumber.trim().isEmpty()) {
            throw new RuntimeException("Card UID (passNumber) is required.");
        }

        // Normalize UID (RFID hex) so we don't get "865a4ba6" vs "865A4BA6" duplicates
        String normalizedUid = passNumber.trim().toUpperCase();

        // Check for existing pass with the same UID
        VisitorPass existing = visitorPassRepository.findByPassNumber(normalizedUid);
        if (existing != null) {
            String label = existing.getDisplayCode() != null && !existing.getDisplayCode().isEmpty()
                    ? existing.getDisplayCode()
                    : normalizedUid;

            throw new RuntimeException(
                    "A visitor pass already exists for card UID " + normalizedUid +
                            " (label: " + label + "). Edit or reuse that pass instead of creating a new one."
            );
        }

        // Status handling (existing logic, just re-used)
        if (status == null || status.trim().isEmpty()) {
            status = "AVAILABLE";
        }
        String normalizedStatus = status.trim().toUpperCase();
        if (!ALLOWED_STATUSES.contains(normalizedStatus)) {
            throw new RuntimeException("Invalid status for new pass: " + status);
        }

        VisitorPass pass = new VisitorPass(normalizedUid, visitorPassID, normalizedStatus);
        return visitorPassRepository.save(pass);
    }

    /**
     * Get all passes.
     */
    public List<VisitorPass> getAllPasses() {
        return visitorPassRepository.findAll();
    }

    /**
     * Get only available passes.
     */
    public List<VisitorPass> getAvailablePasses() {
        return visitorPassRepository.findByStatusIgnoreCase("AVAILABLE");
    }

    /**
     * Update only the STATUS field of a visitor pass.
     * (Admin use, not for Guard "IN_USE" logic)
     */
    public VisitorPass updatePassStatus(Long passId, String status) {
        if (status == null || status.trim().isEmpty()) {
            throw new RuntimeException("Status must not be empty.");
        }

        String normalized = status.trim().toUpperCase();
        if (!ALLOWED_STATUSES.contains(normalized)) {
            throw new RuntimeException("Invalid status: " + status);
        }

        Optional<VisitorPass> opt = visitorPassRepository.findById(passId);
        if (!opt.isPresent()) {
            throw new RuntimeException("VisitorPass not found");
        }

        VisitorPass pass = opt.get();
        pass.setStatus(normalized);
        return visitorPassRepository.save(pass);
    }

    /**
     * "Delete" pass – soft delete by deactivating.
     * If pass is IN_USE, refuse.
     */
    public void deletePass(Long passId) {
        Optional<VisitorPass> opt = visitorPassRepository.findById(passId);
        if (!opt.isPresent()) {
            throw new RuntimeException("VisitorPass not found");
        }

        VisitorPass pass = opt.get();

        if ("IN_USE".equalsIgnoreCase(pass.getStatus())) {
            throw new RuntimeException(
                    "Cannot delete a pass that is currently IN_USE. Revoke it from the visitor log first."
            );
        }

        // Soft-delete: mark as INACTIVE instead of actual delete
        pass.setStatus("INACTIVE");
        visitorPassRepository.save(pass);
    }

    /**
     * Hard delete (probably not used).
     */
    public void deletePassPerm(Long passId) {
        if (!visitorPassRepository.existsById(passId)) {
            throw new RuntimeException("VisitorPass not found");
        }
        visitorPassRepository.deleteById(passId);
    }

    /**
     * Update metadata fields (displayCode, originLocation, visitorPassID, originStationId).
     * Do NOT touch passNumber or status here.
     */
    public VisitorPass updatePassMetadata(
            Long passId,
            String displayCode,
            String originLocation,
            String visitorPassID,
            Long originStationId
    ) {
        Optional<VisitorPass> opt = visitorPassRepository.findById(passId);
        if (!opt.isPresent()) {
            throw new RuntimeException("VisitorPass not found");
        }

        VisitorPass pass = opt.get();

        // displayCode
        if (displayCode != null && !displayCode.trim().isEmpty()) {
            pass.setDisplayCode(displayCode.trim());
        } else {
            pass.setDisplayCode(null);
        }

        // originLocation (optional)
        if (originLocation != null && !originLocation.trim().isEmpty()) {
            pass.setOriginLocation(originLocation.trim());
        } else {
            pass.setOriginLocation(null);
        }

        // external RFID id (optional)
        if (visitorPassID != null && !visitorPassID.trim().isEmpty()) {
            pass.setVisitorPassID(visitorPassID.trim());
        } else {
            pass.setVisitorPassID(null);
        }

        // station id (may be null)
        pass.setOriginStationId(originStationId);

        return visitorPassRepository.save(pass);
    }

    /**
     * Find a pass by RFID UID. We try both visitorPassID and passNumber.
     */
    public Optional<VisitorPass> findByUid(String uid) {
        if (uid == null || uid.trim().isEmpty()) {
            return Optional.empty();
        }

        String normalizedUid = uid.trim().toUpperCase();

        // 1) Try visitorPassID
        VisitorPass byExternalId = visitorPassRepository.findByVisitorPassID(uid);
        if (byExternalId != null) {
            return Optional.of(byExternalId);
        }

        // 2) Try passNumber (e.g. "865A4BA6")
        VisitorPass byPassNumber = visitorPassRepository.findByPassNumber(normalizedUid);
        if (byPassNumber != null) {
            return Optional.of(byPassNumber);
        }

        return Optional.empty();
    }
}
