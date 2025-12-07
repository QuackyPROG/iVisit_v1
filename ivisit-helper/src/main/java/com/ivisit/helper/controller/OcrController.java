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
import java.util.HashMap;
import java.util.Map;

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
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890- /"
        );
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

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", message);
        return ResponseEntity.status(status).body(body);
    }
}
