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
        // Set DPI for better OCR (prevents "Invalid resolution 0 dpi" warning)
        this.tesseract.setTessVariable("user_defined_dpi", "300");
        this.tesseract.setTessVariable(
                "tessedit_char_whitelist",
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890- /,.");
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

        results.add(runOcr(ImagePreprocessor.preprocessStandard(original), "standard"));
        results.add(runOcr(ImagePreprocessor.preprocessHighContrast(original), "highContrast"));
        results.add(runOcr(ImagePreprocessor.preprocessInverted(original), "inverted"));
        results.add(runOcr(ImagePreprocessor.preprocessBinarized(original), "binarized"));
        results.add(runOcr(ImagePreprocessor.preprocessAdaptiveLocal(original), "adaptiveLocal"));

        OcrResult best = selectBest(results);

        Map<String, Object> response = new HashMap<>();
        response.put("extractedText", best.text);
        response.put("method", best.method);
        response.put("score", best.score);

        System.out.println("Helper OCR (multipass): tried " + results.size() + " methods");
        System.out.println("  - Best method: " + best.method + ", score: " + best.score);
        System.out.println("  - Text preview: "
                + (best.text.length() > 100 ? best.text.substring(0, 100) + "..." : best.text).replace("\n", " "));
        return ResponseEntity.ok(response);
    }

    private OcrResult runOcr(BufferedImage image, String method) {
        try {
            String text = tesseract.doOCR(image);
            int score = scoreResult(text);
            return new OcrResult(text, method, score);
        } catch (Exception e) {
            return new OcrResult("", method, 0);
        }
    }

    private int scoreResult(String text) {
        if (text == null || text.isEmpty())
            return 0;

        long alphaNum = text.chars().filter(Character::isLetterOrDigit).count();

        long garbage = text.chars()
                .filter(c -> !Character.isLetterOrDigit(c) && !Character.isWhitespace(c) && c != '-' && c != '/')
                .count();
        return (int) (alphaNum - garbage * 2);
    }

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
