package com.ivisit.helper.controller;

import com.ivisit.helper.utils.ImagePreprocessor;
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

@RestController
@RequestMapping("/api/ocr")
public class OcrController {

    private final Tesseract tesseract;

    public OcrController(@Value("${tesseract.datapath}") String dataPath) {
        this.tesseract = new Tesseract();
        this.tesseract.setDatapath(dataPath);
        this.tesseract.setLanguage("eng");
        this.tesseract.setTessVariable(
                "tessedit_char_whitelist",
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890- /");
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> extractText(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return error(HttpStatus.BAD_REQUEST, "Empty file");
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

        BufferedImage processed = ImagePreprocessor.preprocess(original);

        String result;
        try {
            result = tesseract.doOCR(processed);
        } catch (TesseractException e) {
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "OCR failed: " + e.getMessage());
        }

        Map<String, Object> response = new HashMap<>();
        response.put("extractedText", result);

        System.out.println("Helper OCR: received file " + file.getOriginalFilename());
        return ResponseEntity.ok(response);
    }

    /**
     * Multi-pass OCR endpoint (Sprint 06)
     * Tries multiple preprocessing variants and returns the best result
     */
    @PostMapping("/multipass")
    public ResponseEntity<Map<String, Object>> extractTextMultipass(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return error(HttpStatus.BAD_REQUEST, "Empty file");
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

        List<OcrResult> results = new ArrayList<>();

        // Pass 1: Standard preprocessing
        results.add(runOcr(ImagePreprocessor.preprocessStandard(original), "standard"));

        // Pass 2: High contrast for faded text
        results.add(runOcr(ImagePreprocessor.preprocessHighContrast(original), "highContrast"));

        // Pass 3: Inverted for dark backgrounds
        results.add(runOcr(ImagePreprocessor.preprocessInverted(original), "inverted"));

        // Pass 4: Binarized (pure black/white) to eliminate colored security patterns
        results.add(runOcr(ImagePreprocessor.preprocessBinarized(original), "binarized"));

        // Select the best result
        OcrResult best = selectBest(results);

        Map<String, Object> response = new HashMap<>();
        response.put("extractedText", best.text);
        response.put("method", best.method);
        response.put("score", best.score);

        System.out.println("Helper OCR (multipass): best method = " + best.method + ", score = " + best.score);
        return ResponseEntity.ok(response);
    }

    /**
     * Run OCR with a specific preprocessing method
     */
    private OcrResult runOcr(BufferedImage image, String method) {
        try {
            String text = tesseract.doOCR(image);
            int score = scoreResult(text);
            return new OcrResult(text, method, score);
        } catch (Exception e) {
            return new OcrResult("", method, 0);
        }
    }

    /**
     * Score OCR result based on quality heuristics
     * Higher score = better result
     */
    private int scoreResult(String text) {
        if (text == null || text.isEmpty())
            return 0;

        // Count alphanumeric characters (actual content)
        long alphaNum = text.chars().filter(Character::isLetterOrDigit).count();

        // Penalize garbage/noise characters
        long garbage = text.chars()
                .filter(c -> !Character.isLetterOrDigit(c) && !Character.isWhitespace(c) && c != '-' && c != '/')
                .count();

        // Prefer results with more content and less noise
        return (int) (alphaNum - garbage * 2);
    }

    /**
     * Select the best OCR result from multiple passes
     */
    private OcrResult selectBest(List<OcrResult> results) {
        return results.stream()
                .max(Comparator.comparingInt(r -> r.score))
                .orElse(results.get(0));
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", message);
        return ResponseEntity.status(status).body(body);
    }

    /**
     * Internal class to hold OCR result with metadata
     */
    private static class OcrResult {
        final String text;
        final String method;
        final int score;

        OcrResult(String text, String method, int score) {
            this.text = text;
            this.method = method;
            this.score = score;
        }
    }
}
