package com.ivisit.helper.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;

/**
 * AI Vision-based OCR controller using OpenRouter API.
 * Provides accurate ID extraction using Claude/GPT vision models.
 */
@RestController
@RequestMapping("/api/ocr")
public class VisionOcrController {

    @Value("${openrouter.api.key}")
    private String apiKey;

    @Value("${openrouter.api.url}")
    private String apiUrl;

    @Value("${openrouter.model}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Extract ID information using AI vision
     */
    @PostMapping("/vision")
    public ResponseEntity<Map<String, Object>> extractWithVision(
            @RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return error(HttpStatus.BAD_REQUEST, "Empty file");
        }

        try {
            // Convert image to base64
            String base64Image = encodeImageToBase64(file);
            String mimeType = file.getContentType() != null ? file.getContentType() : "image/jpeg";

            // Build the prompt for ID extraction (including gender)
            String prompt = "Analyze this Philippine ID card image and extract the following information. " +
                    "Return ONLY a JSON object with these exact fields (use empty string if not found): " +
                    "{ \"fullName\": \"extracted full name\", \"idNumber\": \"extracted ID number\", " +
                    "\"dob\": \"date of birth in YYYY-MM-DD format\", \"address\": \"extracted address\", " +
                    "\"idType\": \"type of ID (e.g. Driver's License, SSS ID, National ID, UMID)\", " +
                    "\"gender\": \"Male or Female based on SEX/M/F field on ID\" } " +
                    "Important: For names, use format FIRSTNAME MIDDLENAME LASTNAME. " +
                    "For dates, convert to YYYY-MM-DD format. " +
                    "For gender, look for SEX field or M/F indicator and return 'Male' or 'Female'. " +
                    "Extract the ID/License number exactly as shown. Only return the JSON, no other text.";

            // Call OpenRouter API
            Map<String, Object> response = callOpenRouterVision(base64Image, mimeType, prompt);

            System.out.println("Vision OCR: extracted fields from image");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("Vision OCR error: " + e.getMessage());
            e.printStackTrace();
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "Vision OCR failed: " + e.getMessage());
        }
    }

    /**
     * Encode image file to base64 string
     */
    private String encodeImageToBase64(MultipartFile file) throws IOException {
        byte[] bytes = file.getBytes();
        return Base64.getEncoder().encodeToString(bytes);
    }

    /**
     * Call OpenRouter API with vision request
     */
    private Map<String, Object> callOpenRouterVision(String base64Image, String mimeType, String prompt) {
        // Build request headers
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey);
        headers.set("HTTP-Referer", "https://ivisitust.com");
        headers.set("X-Title", "iVisit ID Scanner");

        // Build message content with image
        List<Map<String, Object>> messageContent = new ArrayList<>();

        // Add text part
        Map<String, Object> textPart = new HashMap<>();
        textPart.put("type", "text");
        textPart.put("text", prompt);
        messageContent.add(textPart);

        // Add image part
        Map<String, Object> imagePart = new HashMap<>();
        imagePart.put("type", "image_url");
        Map<String, String> imageUrl = new HashMap<>();
        imageUrl.put("url", "data:" + mimeType + ";base64," + base64Image);
        imagePart.put("image_url", imageUrl);
        messageContent.add(imagePart);

        // Build messages array
        List<Map<String, Object>> messages = new ArrayList<>();
        Map<String, Object> userMessage = new HashMap<>();
        userMessage.put("role", "user");
        userMessage.put("content", messageContent);
        messages.add(userMessage);

        // Build request body
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", model);
        requestBody.put("messages", messages);
        requestBody.put("max_tokens", 500);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

        // Make API call
        ResponseEntity<Map> apiResponse = restTemplate.postForEntity(apiUrl, request, Map.class);

        // Parse response
        Map<String, Object> result = new HashMap<>();
        result.put("method", "vision");
        result.put("model", model);

        if (apiResponse.getBody() != null) {
            try {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) apiResponse.getBody().get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    String content = (String) message.get("content");

                    // Try to parse JSON from response
                    result.put("rawResponse", content);

                    // Extract JSON from response (handle markdown code blocks)
                    String jsonStr = extractJson(content);
                    if (jsonStr != null) {
                        // Parse the JSON manually (simple approach)
                        result.put("fields", parseSimpleJson(jsonStr));
                    }
                }
            } catch (Exception e) {
                System.err.println("Error parsing OpenRouter response: " + e.getMessage());
                result.put("error", "Failed to parse response");
            }
        }

        return result;
    }

    /**
     * Extract JSON from response (handles markdown code blocks)
     */
    private String extractJson(String content) {
        if (content == null)
            return null;

        // Remove markdown code blocks if present
        content = content.trim();
        if (content.startsWith("```json")) {
            content = content.substring(7);
        } else if (content.startsWith("```")) {
            content = content.substring(3);
        }
        if (content.endsWith("```")) {
            content = content.substring(0, content.length() - 3);
        }

        // Find JSON object
        int start = content.indexOf('{');
        int end = content.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return content.substring(start, end + 1);
        }
        return null;
    }

    /**
     * Simple JSON parser for the expected structure
     */
    private Map<String, String> parseSimpleJson(String json) {
        Map<String, String> result = new HashMap<>();
        String[] fields = { "fullName", "idNumber", "dob", "address", "idType", "gender" };

        for (String field : fields) {
            String pattern = "\"" + field + "\"\\s*:\\s*\"([^\"]*)\"";
            java.util.regex.Pattern p = java.util.regex.Pattern.compile(pattern);
            java.util.regex.Matcher m = p.matcher(json);
            if (m.find()) {
                result.put(field, m.group(1));
            } else {
                result.put(field, "");
            }
        }

        return result;
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String message) {
        Map<String, Object> err = new HashMap<>();
        err.put("error", message);
        return ResponseEntity.status(status).body(err);
    }
}
