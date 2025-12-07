package com.ivisit.backend.controller;

import com.ivisit.backend.dto.ArchiveVisitorsRequest;
import com.ivisit.backend.dto.VisitorDTO;
import com.ivisit.backend.dto.VisitorRegistrationResponse;
import com.ivisit.backend.model.Visitor;
import com.ivisit.backend.service.VisitorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.text.ParseException;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/visitors")
public class VisitorController {

    @Autowired
    private VisitorService visitorService;

    @PostMapping("/register")
    public ResponseEntity<VisitorRegistrationResponse> registerVisitor(
            @RequestParam("visitorName") String visitorName,
            @RequestParam("dob") String dob,
            @RequestParam("idNumber") String idNumber,
            @RequestParam("idType") String idType,
            @RequestParam(value = "visitorType", required = false) String visitorType,
            @RequestParam(value = "gender", required = false) String gender,
            @RequestParam(value = "idImage", required = false) MultipartFile idImage,
            @RequestParam(value = "personPhoto", required = false) MultipartFile personPhoto
    ) throws IOException, ParseException {

        String idImagePath = null;
        String personPhotoPath = null;

        if (idImage != null && !idImage.isEmpty()) {
            idImagePath = visitorService.saveFile(
                    idImage.getBytes(),
                    idImage.getOriginalFilename(),
                    "id_"
            );
        }
        if (personPhoto != null && !personPhoto.isEmpty()) {
            personPhotoPath = visitorService.saveFile(
                    personPhoto.getBytes(),
                    personPhoto.getOriginalFilename(),
                    "person_"
            );
        }

        // NOTE: assumes VisitorService.registerVisitor(...) now has a signature
        // like: (visitorName, dob, idNumber, idType, visitorType, gender, idImagePath, personPhotoPath)
        Visitor saved = visitorService.registerVisitor(
                visitorName,
                dob,
                idNumber,
                idType,
                visitorType,
                gender,
                idImagePath,
                personPhotoPath
        );

        VisitorRegistrationResponse dto = new VisitorRegistrationResponse(
                "Visitor registered successfully",
                saved.getVisitorID(),
                idImagePath,
                personPhotoPath,
                saved.getCreatedAt() != null ? saved.getCreatedAt().toString() : null
        );

        return ResponseEntity.ok(dto);
    }

    @GetMapping
    public ResponseEntity<List<VisitorDTO>> listVisitors() {
        List<Visitor> visitors = visitorService.listAllVisitors();

        List<VisitorDTO> dtos = visitors.stream().map(v -> {
            String dobStr = v.getDateOfBirth() != null ? v.getDateOfBirth().toString() : null;
            String created = v.getCreatedAt() != null ? v.getCreatedAt().toString() : null;
            String archivedAt = v.getArchivedAt() != null ? v.getArchivedAt().toString() : null;

            VisitorDTO dto = new VisitorDTO(
                    v.getVisitorID(),
                    v.getVisitorName(),
                    dobStr,
                    v.getIdNumber(),
                    v.getIdType(),
                    v.getVisitorType(),
                    created,
                    v.getPhotoPath()
            );
            // propagate gender
            dto.setGender(v.getGender());

            // keep archived data as before
            dto.getArchived();
            dto.setArchivedAt(archivedAt);
            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/archived")
    public ResponseEntity<List<VisitorDTO>> listArchivedVisitors() {
        List<Visitor> visitors = visitorService.listArchivedVisitors();

        List<VisitorDTO> dtos = visitors.stream().map(v -> {
            String dobStr = v.getDateOfBirth() != null ? v.getDateOfBirth().toString() : null;
            String created = v.getCreatedAt() != null ? v.getCreatedAt().toString() : null;
            String archivedAt = v.getArchivedAt() != null ? v.getArchivedAt().toString() : null;

            VisitorDTO dto = new VisitorDTO(
                    v.getVisitorID(),
                    v.getVisitorName(),
                    dobStr,
                    v.getIdNumber(),
                    v.getIdType(),
                    v.getVisitorType(),
                    created,
                    v.getPhotoPath()
            );
            // propagate gender as well
            dto.setGender(v.getGender());

            dto.getArchived();
            dto.setArchivedAt(archivedAt);
            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/archive")
    public ResponseEntity<?> archiveVisitors(@RequestBody ArchiveVisitorsRequest request) {
        if (request.getVisitorIds() == null || request.getVisitorIds().isEmpty()) {
            return ResponseEntity.badRequest().body("No visitor IDs provided");
        }

        try {
            visitorService.archiveVisitors(request.getVisitorIds());
            return ResponseEntity.ok("Visitors archived successfully");
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body("Failed to archive visitors: " + e.getMessage());
        }
    }
}
