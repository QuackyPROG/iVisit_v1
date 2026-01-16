package com.ivisit.helper.utils;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.awt.image.ConvolveOp;
import java.awt.image.Kernel;
import java.awt.image.RescaleOp;

/**
 * Image preprocessing for OCR accuracy improvement.
 * Pipeline: Grayscale → Sharpen → Adaptive Contrast → Resize
 */
public class ImagePreprocessor {

    /**
     * Main preprocessing pipeline for OCR accuracy:
     * 1. Convert to grayscale
     * 2. Apply sharpening filter (Sprint 02)
     * 3. Adaptive contrast using Otsu threshold (Sprint 04)
     * 4. Resize to minimum 1200px width (Sprint 01)
     */
    public static BufferedImage preprocess(BufferedImage input) {
        // 1. Convert to grayscale
        BufferedImage gray = toGrayscale(input);

        // 2. Apply sharpening to enhance edges (Sprint 02)
        BufferedImage sharpened = sharpen(gray);

        // 3. Adaptive contrast using Otsu threshold (Sprint 04)
        BufferedImage contrasted = adaptiveContrast(sharpened);

        // 4. Resize if width < 1200px (Sprint 01)
        return resize(contrasted, 1200);
    }

    /**
     * Convert image to grayscale
     */
    private static BufferedImage toGrayscale(BufferedImage input) {
        BufferedImage gray = new BufferedImage(
                input.getWidth(), input.getHeight(), BufferedImage.TYPE_BYTE_GRAY);
        Graphics g = gray.getGraphics();
        g.drawImage(input, 0, 0, null);
        g.dispose();
        return gray;
    }

    /**
     * Apply 3x3 sharpening kernel to enhance text edges.
     * Uses Laplacian kernel for edge enhancement.
     */
    private static BufferedImage sharpen(BufferedImage image) {
        // 3x3 Laplacian sharpening kernel
        float[] kernel = {
                0, -1, 0,
                -1, 5, -1,
                0, -1, 0
        };
        Kernel sharpenKernel = new Kernel(3, 3, kernel);

        // ConvolveOp requires RGB image, convert temporarily
        BufferedImage rgb = new BufferedImage(
                image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D gRgb = rgb.createGraphics();
        gRgb.drawImage(image, 0, 0, null);
        gRgb.dispose();

        // Apply convolution
        ConvolveOp op = new ConvolveOp(sharpenKernel, ConvolveOp.EDGE_NO_OP, null);
        BufferedImage sharpened = op.filter(rgb, null);

        // Convert back to grayscale
        BufferedImage gray = new BufferedImage(
                sharpened.getWidth(), sharpened.getHeight(), BufferedImage.TYPE_BYTE_GRAY);
        Graphics g = gray.getGraphics();
        g.drawImage(sharpened, 0, 0, null);
        g.dispose();

        return gray;
    }

    /**
     * Calculate optimal threshold using Otsu's method (Sprint 04)
     * Finds threshold that minimizes intra-class variance
     */
    private static int calculateOtsuThreshold(BufferedImage gray) {
        int width = gray.getWidth();
        int height = gray.getHeight();
        int[] histogram = new int[256];

        // Build histogram
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int pixel = gray.getRaster().getSample(x, y, 0);
                histogram[pixel]++;
            }
        }

        int total = width * height;
        float sum = 0;
        for (int i = 0; i < 256; i++) {
            sum += i * histogram[i];
        }

        float sumB = 0;
        int wB = 0;
        int wF;
        float maxVariance = 0;
        int threshold = 128; // Default fallback

        for (int t = 0; t < 256; t++) {
            wB += histogram[t];
            if (wB == 0)
                continue;

            wF = total - wB;
            if (wF == 0)
                break;

            sumB += t * histogram[t];
            float mB = sumB / wB;
            float mF = (sum - sumB) / wF;

            float variance = (float) wB * wF * (mB - mF) * (mB - mF);
            if (variance > maxVariance) {
                maxVariance = variance;
                threshold = t;
            }
        }

        return threshold;
    }

    /**
     * Apply adaptive contrast using Otsu-determined threshold (Sprint 04)
     * Adjusts contrast based on image brightness characteristics
     */
    private static BufferedImage adaptiveContrast(BufferedImage gray) {
        int threshold = calculateOtsuThreshold(gray);

        // Calculate adaptive scale factor based on threshold
        // Images with low threshold (dark) need more boost
        // Images with high threshold (bright) need less boost
        float scaleFactor = 1.2f + (128f - threshold) / 256f;

        // Clamp to reasonable range (1.1 - 2.0)
        scaleFactor = Math.max(1.1f, Math.min(2.0f, scaleFactor));

        // Safety fallback: if Otsu gives extreme values, use fixed 1.5x
        if (threshold < 30 || threshold > 220) {
            scaleFactor = 1.5f;
        }

        RescaleOp rescale = new RescaleOp(scaleFactor, 0, null);
        BufferedImage result = new BufferedImage(
                gray.getWidth(), gray.getHeight(), BufferedImage.TYPE_BYTE_GRAY);
        return rescale.filter(gray, result);
    }

    /**
     * Resize image to minimum width while maintaining aspect ratio
     */
    private static BufferedImage resize(BufferedImage image, int minWidth) {
        int targetWidth = Math.max(image.getWidth(), minWidth);
        int targetHeight = (int) ((double) image.getHeight() / image.getWidth() * targetWidth);

        BufferedImage resized = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g2 = resized.createGraphics();
        g2.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g2.drawImage(image, 0, 0, targetWidth, targetHeight, null);
        g2.dispose();

        return resized;
    }

    // ========== MULTI-PASS OCR VARIANTS (Sprint 06) ==========

    /**
     * Standard preprocessing (same as main preprocess method)
     */
    public static BufferedImage preprocessStandard(BufferedImage input) {
        return preprocess(input);
    }

    /**
     * High contrast preprocessing for faded or washed-out text
     */
    public static BufferedImage preprocessHighContrast(BufferedImage input) {
        BufferedImage gray = toGrayscale(input);
        BufferedImage sharpened = sharpen(gray);

        // Aggressive contrast boost
        RescaleOp rescale = new RescaleOp(2.0f, -50, null);
        BufferedImage contrasted = rescale.filter(sharpened, null);

        return resize(contrasted, 1200);
    }

    /**
     * Inverted preprocessing for dark backgrounds or reverse text
     */
    public static BufferedImage preprocessInverted(BufferedImage input) {
        BufferedImage gray = toGrayscale(input);
        BufferedImage inverted = invert(gray);
        BufferedImage contrasted = adaptiveContrast(inverted);

        return resize(contrasted, 1200);
    }

    /**
     * Invert image colors (for dark backgrounds)
     */
    private static BufferedImage invert(BufferedImage image) {
        int width = image.getWidth();
        int height = image.getHeight();
        BufferedImage inverted = new BufferedImage(width, height, BufferedImage.TYPE_BYTE_GRAY);

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int pixel = image.getRaster().getSample(x, y, 0);
                inverted.getRaster().setSample(x, y, 0, 255 - pixel);
            }
        }

        return inverted;
    }
}
