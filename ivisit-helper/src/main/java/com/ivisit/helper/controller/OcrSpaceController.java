package com.ivisit.helper.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.regex.*;

/**
 * OCR.space API controller for text extraction.
 * Acts as fallback when OpenRouter Vision fails.
 * API docs: https://ocr.space/ocrapi
 */
@RestController
@RequestMapping("/api/ocr")
public class OcrSpaceController {

    @Value("${ocrspace.api.key}")
    private String apiKey;

    @Value("${ocrspace.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Extract text using OCR.space API
     * Returns parsed text and structured fields
     */
    @PostMapping("/ocrspace")
    public ResponseEntity<Map<String, Object>> extractWithOcrSpace(
            @RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return error(HttpStatus.BAD_REQUEST, "Empty file");
        }

        try {
            // Compress image to under 1MB for OCR.space free tier
            byte[] imageBytes;
            try {
                imageBytes = compressImage(file.getBytes());
                System.out.println("[OCR.space] Image size: " + imageBytes.length / 1024 + " KB");
            } catch (Exception compressError) {
                System.err.println("[OCR.space] Compression failed, using original: " + compressError.getMessage());
                imageBytes = file.getBytes();
            }

            // Prepare multipart request
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.set("apikey", apiKey);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new org.springframework.core.io.ByteArrayResource(imageBytes) {
                @Override
                public String getFilename() {
                    return "id-card.jpg"; // Always send as JPEG
                }
            });
            body.add("language", "eng");
            body.add("isOverlayRequired", "false");
            body.add("detectOrientation", "true");
            body.add("scale", "true");
            body.add("OCREngine", "2"); // Engine 2 is better for complex backgrounds

            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);

            // Call OCR.space API
            System.out.println("[OCR.space] Sending request...");
            ResponseEntity<Map> response = restTemplate.postForEntity(apiUrl, request, Map.class);

            Map<String, Object> result = new HashMap<>();
            result.put("method", "ocrspace");

            if (response.getBody() != null) {
                List<Map<String, Object>> parsedResults = (List<Map<String, Object>>) response.getBody()
                        .get("ParsedResults");

                if (parsedResults != null && !parsedResults.isEmpty()) {
                    String parsedText = (String) parsedResults.get(0).get("ParsedText");
                    result.put("extractedText", parsedText != null ? parsedText : "");
                    result.put("success", true);

                    // Try to extract structured fields from text
                    Map<String, String> fields = extractFieldsFromText(parsedText);
                    result.put("fields", fields);

                    System.out.println("[OCR.space] Success - extracted " +
                            (parsedText != null ? parsedText.length() : 0) + " characters");
                } else {
                    // Check for errors - handle both String and List types
                    Boolean isErroredOnProcessing = (Boolean) response.getBody().get("IsErroredOnProcessing");
                    Object errorMessageObj = response.getBody().get("ErrorMessage");
                    String errorMessage = "Unknown error";

                    if (errorMessageObj instanceof String) {
                        errorMessage = (String) errorMessageObj;
                    } else if (errorMessageObj instanceof List) {
                        List<?> errorList = (List<?>) errorMessageObj;
                        if (!errorList.isEmpty()) {
                            errorMessage = errorList.get(0).toString();
                        }
                    }

                    if (Boolean.TRUE.equals(isErroredOnProcessing)) {
                        System.err.println("[OCR.space] Error: " + errorMessage);
                        result.put("error", errorMessage);
                        result.put("success", false);
                    } else {
                        result.put("extractedText", "");
                        result.put("success", false);
                    }
                }
            }

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            System.err.println("[OCR.space] Exception: " + e.getMessage());
            e.printStackTrace();
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "OCR.space failed: " + e.getMessage());
        }
    }

    /**
     * Smart OCR endpoint - tries all OCR methods in order:
     * 1. OCR.space (best balance of accuracy and speed)
     * 2. Returns result with extracted fields
     */
    @PostMapping("/smart")
    public ResponseEntity<Map<String, Object>> smartOcr(@RequestParam("file") MultipartFile file) {
        // Just use OCR.space for the /smart endpoint
        return extractWithOcrSpace(file);
    }

    /**
     * Extract structured fields from OCR text
     * Looks for common ID patterns
     */
    private Map<String, String> extractFieldsFromText(String text) {
        Map<String, String> fields = new HashMap<>();
        if (text == null || text.isEmpty()) {
            return fields;
        }

        String[] lines = text.split("\n");

        // PhilHealth ID pattern
        Pattern philhealthPattern = Pattern.compile("(\\d{2})[-\\s]?(\\d{9})[-\\s]?(\\d)");
        Matcher philhealthMatcher = philhealthPattern.matcher(text.replaceAll("\\s+", ""));
        if (philhealthMatcher.find()) {
            fields.put("idNumber", philhealthMatcher.group(1) + "-" +
                    philhealthMatcher.group(2) + "-" + philhealthMatcher.group(3));
            fields.put("idType", "PhilHealth ID");
        }

        // SSS ID pattern
        Pattern sssPattern = Pattern.compile("(\\d{2})[-\\s]?(\\d{7})[-\\s]?(\\d)");
        Matcher sssMatcher = sssPattern.matcher(text.replaceAll("\\s+", ""));
        if (sssMatcher.find() && !fields.containsKey("idNumber")) {
            fields.put("idNumber", sssMatcher.group(1) + "-" +
                    sssMatcher.group(2) + "-" + sssMatcher.group(3));
            fields.put("idType", "SSS ID");
        }

        // National ID patterns, tries PSN format first
        Pattern psnPattern = Pattern
                .compile("(?:PSN[-–\\s]*)?([\\dO]{4})[-–\\s]?([\\dO]{3,4})[-–\\s]?([\\dO]{4})[-–\\s]?([\\dO]{1,4})");
        Matcher psnMatcher = psnPattern.matcher(text.replaceAll("[oO]", "0"));
        if (psnMatcher.find() && !fields.containsKey("idNumber")) {
            String g1 = psnMatcher.group(1).replaceAll("[oO]", "0");
            String g2 = psnMatcher.group(2).replaceAll("[oO]", "0");
            String g3 = psnMatcher.group(3).replaceAll("[oO]", "0");
            String g4 = psnMatcher.group(4).replaceAll("[oO]", "0");
            fields.put("idNumber", g1 + "-" + g2 + "-" + g3 + "-" + g4);
            fields.put("idType", "National ID");
        }

        if (!fields.containsKey("idNumber")) {
            Pattern nationalIdPattern = Pattern.compile("(\\d{4})[-\\s]?(\\d{4})[-\\s]?(\\d{4})[-\\s]?(\\d{4})");
            Matcher nationalIdMatcher = nationalIdPattern.matcher(text);
            if (nationalIdMatcher.find()) {
                fields.put("idNumber", nationalIdMatcher.group(1) + "-" +
                        nationalIdMatcher.group(2) + "-" +
                        nationalIdMatcher.group(3) + "-" + nationalIdMatcher.group(4));
                fields.put("idType", "National ID");
            }
        }

        StringBuilder nameBuilder = new StringBuilder();
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.length() >= 3 && trimmed.length() <= 40 &&
                    trimmed.equals(trimmed.toUpperCase()) &&
                    trimmed.matches("^[A-Z\\s,.-]+$") &&
                    !trimmed.matches(".*\\d.*")) {
                if (!trimmed.contains("REPUBLIC") &&
                        !trimmed.contains("PILIPINAS") &&
                        !trimmed.contains("PHILIPPINES") &&
                        !trimmed.contains("PHILHEALTH") &&
                        !trimmed.contains("PAMBANSANG") &&
                        !trimmed.contains("PAGKAKAKILANLAN") &&
                        !trimmed.contains("DEPARTMENT") &&
                        !trimmed.contains("NATIONAL") &&
                        !trimmed.contains("IDENTIFICATION") &&
                        !trimmed.contains("APELYIDO") &&
                        !trimmed.contains("PANGALAN") &&
                        !trimmed.contains("GITNANG") &&
                        !trimmed.contains("TIRAHAN") &&
                        !trimmed.contains("PETSA") &&
                        !trimmed.contains("KAPANGANAKAN") &&
                        !trimmed.contains("KASARIAN") &&
                        !trimmed.contains("KATAYUANG") &&
                        !trimmed.contains("DUGO") &&
                        !trimmed.contains("NAME") &&
                        !trimmed.contains("DATE") &&
                        !trimmed.contains("BIRTH") &&
                        !trimmed.contains("ADDRESS") &&
                        !trimmed.contains("SECURITY") &&
                        !trimmed.contains("SOCIAL") &&
                        !trimmed.contains("SYSTEM") &&
                        !trimmed.contains("BRGY") &&
                        !trimmed.contains("BARANGAY") &&
                        !trimmed.contains("METRO") &&
                        !trimmed.contains("MANILA") &&
                        !trimmed.contains("CITY") &&
                        !trimmed.contains("QUEZON") &&
                        !trimmed.contains("MAKATI") &&
                        !trimmed.contains("PASIG") &&
                        !trimmed.contains("STATUS") &&
                        !trimmed.contains("SINGLE") &&
                        !trimmed.contains("MARRIED") &&
                        !trimmed.contains("MALE") &&
                        !trimmed.contains("FEMALE") &&
                        !trimmed.contains("PHL") &&
                        !trimmed.contains("PSN") &&
                        !trimmed.contains("SAMPLE") &&
                        trimmed.length() > 2) {
                    if (nameBuilder.length() > 0) {
                        nameBuilder.append(" ");
                    }
                    nameBuilder.append(trimmed);
                }
            }
        }
        if (nameBuilder.length() > 0) {
            fields.put("fullName", nameBuilder.toString());
        }

        Pattern datePattern = Pattern.compile(
                "(\\d{4})[/-](\\d{2})[/-](\\d{2})|" + // YYYY-MM-DD
                        "(\\d{2})[/-](\\d{2})[/-](\\d{4})|" + // MM-DD-YYYY
                        "(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\\s+(\\d{1,2}),?\\s+(\\d{4})" // Month
                                                                                                                                              // DD,
                                                                                                                                              // YYYY
                , Pattern.CASE_INSENSITIVE);
        Matcher dateMatcher = datePattern.matcher(text);
        if (dateMatcher.find()) {
            fields.put("dob", dateMatcher.group());
        }

        return fields;
    }

    /**
     * Compress image to under 1MB for OCR.space free tier
     * Resizes and converts to JPEG with quality reduction
     */
    private byte[] compressImage(byte[] originalBytes) throws Exception {
        // Read image
        java.io.ByteArrayInputStream bais = new java.io.ByteArrayInputStream(originalBytes);
        java.awt.image.BufferedImage originalImage = javax.imageio.ImageIO.read(bais);

        if (originalImage == null) {
            return originalBytes;
        }

        // Convert to RGB (removes alpha channel for JPEG compatibility)
        // This fixes "Bogus input colorspace" error with PNG images
        java.awt.image.BufferedImage rgbImage = new java.awt.image.BufferedImage(
                originalImage.getWidth(), originalImage.getHeight(),
                java.awt.image.BufferedImage.TYPE_INT_RGB);
        java.awt.Graphics2D g = rgbImage.createGraphics();
        g.setColor(java.awt.Color.WHITE);
        g.fillRect(0, 0, originalImage.getWidth(), originalImage.getHeight());
        g.drawImage(originalImage, 0, 0, null);
        g.dispose();
        originalImage = rgbImage;

        // Resize if too large (max 1200px width)
        int maxWidth = 1200;
        int width = originalImage.getWidth();
        int height = originalImage.getHeight();

        if (width > maxWidth) {
            double scale = (double) maxWidth / width;
            int newWidth = maxWidth;
            int newHeight = (int) (height * scale);

            java.awt.image.BufferedImage resized = new java.awt.image.BufferedImage(
                    newWidth, newHeight, java.awt.image.BufferedImage.TYPE_INT_RGB);
            java.awt.Graphics2D g2 = resized.createGraphics();
            g2.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION,
                    java.awt.RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g2.drawImage(originalImage, 0, 0, newWidth, newHeight, null);
            g2.dispose();
            originalImage = resized;
        }

        // Compress to JPEG
        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();

        float quality = 0.8f;
        while (quality >= 0.3f) {
            baos.reset();

            javax.imageio.ImageWriter writer = javax.imageio.ImageIO
                    .getImageWritersByFormatName("jpeg").next();
            javax.imageio.stream.ImageOutputStream ios = javax.imageio.ImageIO
                    .createImageOutputStream(baos);
            writer.setOutput(ios);

            javax.imageio.plugins.jpeg.JPEGImageWriteParam param = new javax.imageio.plugins.jpeg.JPEGImageWriteParam(
                    null);
            param.setCompressionMode(javax.imageio.ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(quality);

            writer.write(null, new javax.imageio.IIOImage(originalImage, null, null), param);
            writer.dispose();
            ios.close();

            if (baos.size() < 900 * 1024) { // Under 900KB
                break;
            }
            quality -= 0.1f;
        }

        return baos.toByteArray();
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String message) {
        Map<String, Object> err = new HashMap<>();
        err.put("error", message);
        err.put("success", false);
        return ResponseEntity.status(status).body(err);
    }
}
