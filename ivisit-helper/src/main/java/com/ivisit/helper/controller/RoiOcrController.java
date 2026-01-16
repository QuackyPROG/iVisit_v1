package com.ivisit.helper.controller;

import com.ivisit.helper.utils.ImagePreprocessor;
import com.ivisit.helper.utils.RoiTemplate;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.util.*;

/**
 * ROI-based OCR extraction controller.
 * Uses region templates to crop specific fields from ID cards before OCR.
 */
@RestController
@RequestMapping("/api/ocr")
public class RoiOcrController {

    private final Tesseract tesseract;

    public RoiOcrController(@Value("${tesseract.datapath}") String dataPath) {
        this.tesseract = new Tesseract();
        this.tesseract.setDatapath(dataPath);
        this.tesseract.setLanguage("eng");
        // Page segmentation mode 7: single line of text
        this.tesseract.setPageSegMode(7);
        this.tesseract.setTessVariable(
                "tessedit_char_whitelist",
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-/., ");
    }

    /**
     * Extract text from specific regions based on ID type
     */
    @PostMapping("/roi")
    public ResponseEntity<Map<String, Object>> extractWithRoi(
            @RequestParam("file") MultipartFile file,
            @RequestParam("idType") String idType) {
        if (file.isEmpty()) {
            return error(HttpStatus.BAD_REQUEST, "Empty file");
        }

        // Get ROI template for this ID type
        Map<String, RoiTemplate.Region> template = RoiTemplate.getTemplate(idType);
        if (template == null) {
            return error(HttpStatus.BAD_REQUEST, "Unknown ID type: " + idType);
        }

        BufferedImage original;
        try {
            original = ImageIO.read(file.getInputStream());
        } catch (IOException e) {
            return error(HttpStatus.BAD_REQUEST, "Unable to read image: " + e.getMessage());
        }

        if (original == null) {
            return error(HttpStatus.BAD_REQUEST, "Unsupported or corrupt image");
        }

        // Extract each field using its ROI
        Map<String, String> extractedFields = new HashMap<>();

        for (Map.Entry<String, RoiTemplate.Region> entry : template.entrySet()) {
            String fieldName = entry.getKey();
            RoiTemplate.Region region = entry.getValue();

            try {
                // Crop the region
                BufferedImage crop = ImagePreprocessor.cropRegion(
                        original,
                        region.xPct, region.yPct,
                        region.widthPct, region.heightPct);

                // Preprocess the crop (binarize, upscale)
                BufferedImage processed = ImagePreprocessor.preprocessCroppedRegion(crop);

                // Run OCR on the isolated region
                String text = tesseract.doOCR(processed).trim();
                extractedFields.put(fieldName, text);

                System.out.println("ROI OCR [" + fieldName + "]: " + text);
            } catch (TesseractException e) {
                extractedFields.put(fieldName, "");
                System.err.println("ROI OCR error for " + fieldName + ": " + e.getMessage());
            }
        }

        // Build response
        Map<String, Object> response = new HashMap<>();
        response.put("idType", idType);
        response.put("fields", extractedFields);
        response.put("method", "roi");

        // Also build combined text for backward compatibility
        StringBuilder combined = new StringBuilder();
        for (String value : extractedFields.values()) {
            combined.append(value).append("\n");
        }
        response.put("extractedText", combined.toString().trim());

        System.out.println("Helper ROI OCR: processed " + idType + " with " +
                extractedFields.size() + " fields");
        return ResponseEntity.ok(response);
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String message) {
        Map<String, Object> err = new HashMap<>();
        err.put("error", message);
        return ResponseEntity.status(status).body(err);
    }
}
