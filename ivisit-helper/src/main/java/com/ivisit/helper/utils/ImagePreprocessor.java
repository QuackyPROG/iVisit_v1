package com.ivisit.helper.utils;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.awt.image.ConvolveOp;
import java.awt.image.Kernel;
import java.awt.image.RescaleOp;

/**
 * Image preprocessing for OCR accuracy improvement.
 * Enhanced pipeline with advanced techniques for better text extraction.
 *
 * Pipeline: Denoise → Grayscale → Sharpen → Adaptive Contrast → Binarize →
 * Resize
 */
public class ImagePreprocessor {

    // Target resolution for OCR (higher = better accuracy but slower)
    private static final int TARGET_WIDTH = 1600;

    public static BufferedImage preprocess(BufferedImage input) {
        BufferedImage upscaled = upscaleIfNeeded(input, TARGET_WIDTH);
        BufferedImage denoised = denoise(upscaled);
        BufferedImage gray = toGrayscale(denoised);
        BufferedImage sharpened = sharpen(gray);
        BufferedImage contrasted = adaptiveContrast(sharpened);
        return resize(contrasted, TARGET_WIDTH);
    }

    private static BufferedImage upscaleIfNeeded(BufferedImage input, int targetWidth) {
        if (input.getWidth() >= targetWidth) {
            return input;
        }

        double scale = (double) targetWidth / input.getWidth();
        int newWidth = targetWidth;
        int newHeight = (int) (input.getHeight() * scale);

        BufferedImage upscaled = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2 = upscaled.createGraphics();
        g2.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g2.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g2.drawImage(input, 0, 0, newWidth, newHeight, null);
        g2.dispose();

        return upscaled;
    }

    private static BufferedImage denoise(BufferedImage input) {
        // Light 3x3 averaging kernel (less aggressive to preserve edges)
        float weight = 1.0f / 9.0f;
        float[] kernel = {
                weight, weight, weight,
                weight, weight, weight,
                weight, weight, weight
        };
        Kernel blurKernel = new Kernel(3, 3, kernel);

        BufferedImage rgb = toRGB(input);
        ConvolveOp op = new ConvolveOp(blurKernel, ConvolveOp.EDGE_NO_OP, null);

        return op.filter(rgb, null);
    }

    private static BufferedImage toRGB(BufferedImage input) {
        if (input.getType() == BufferedImage.TYPE_INT_RGB) {
            return input;
        }
        BufferedImage rgb = new BufferedImage(input.getWidth(), input.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics g = rgb.getGraphics();
        g.drawImage(input, 0, 0, null);
        g.dispose();
        return rgb;
    }

    private static BufferedImage toGrayscale(BufferedImage input) {
        BufferedImage gray = new BufferedImage(
                input.getWidth(), input.getHeight(), BufferedImage.TYPE_BYTE_GRAY);
        Graphics g = gray.getGraphics();
        g.drawImage(input, 0, 0, null);
        g.dispose();
        return gray;
    }

    private static BufferedImage sharpen(BufferedImage image) {
        // 3x3 Laplacian sharpening kernel (stronger)
        float[] kernel = {
                -0.5f, -1, -0.5f,
                -1, 7, -1,
                -0.5f, -1, -0.5f
        };
        Kernel sharpenKernel = new Kernel(3, 3, kernel);

        BufferedImage rgb = new BufferedImage(
                image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D gRgb = rgb.createGraphics();
        gRgb.drawImage(image, 0, 0, null);
        gRgb.dispose();

        ConvolveOp op = new ConvolveOp(sharpenKernel, ConvolveOp.EDGE_NO_OP, null);
        BufferedImage sharpened = op.filter(rgb, null);

        return toGrayscale(sharpened);
    }

    private static int calculateOtsuThreshold(BufferedImage gray) {
        int width = gray.getWidth();
        int height = gray.getHeight();
        int[] histogram = new int[256];

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
        int threshold = 128;

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

    private static BufferedImage adaptiveContrast(BufferedImage gray) {
        int threshold = calculateOtsuThreshold(gray);

        float scaleFactor = 1.3f + (128f - threshold) / 200f;

        scaleFactor = Math.max(1.2f, Math.min(2.5f, scaleFactor));

        if (threshold < 30 || threshold > 220) {
            scaleFactor = 1.8f;
        }

        float offset = (threshold < 80) ? 20 : 0;

        RescaleOp rescale = new RescaleOp(scaleFactor, offset, null);
        BufferedImage result = new BufferedImage(
                gray.getWidth(), gray.getHeight(), BufferedImage.TYPE_BYTE_GRAY);
        return rescale.filter(gray, result);
    }

    private static BufferedImage resize(BufferedImage image, int minWidth) {
        int targetWidth = Math.max(image.getWidth(), minWidth);
        int targetHeight = (int) ((double) image.getHeight() / image.getWidth() * targetWidth);

        BufferedImage resized = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g2 = resized.createGraphics();
        g2.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g2.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g2.drawImage(image, 0, 0, targetWidth, targetHeight, null);
        g2.dispose();

        return resized;
    }

    public static BufferedImage cropRegion(BufferedImage image,
            double xPct, double yPct,
            double widthPct, double heightPct) {
        int imgWidth = image.getWidth();
        int imgHeight = image.getHeight();

        int x = (int) (xPct * imgWidth);
        int y = (int) (yPct * imgHeight);
        int w = (int) (widthPct * imgWidth);
        int h = (int) (heightPct * imgHeight);

        x = Math.max(0, Math.min(x, imgWidth - 1));
        y = Math.max(0, Math.min(y, imgHeight - 1));
        w = Math.min(w, imgWidth - x);
        h = Math.min(h, imgHeight - y);

        if (w < 10 || h < 10) {
            return image;
        }

        return image.getSubimage(x, y, w, h);
    }

    public static BufferedImage preprocessCroppedRegion(BufferedImage crop) {
        BufferedImage upscaled = upscaleIfNeeded(crop, 600);
        BufferedImage gray = toGrayscale(upscaled);
        BufferedImage sharpened = sharpen(gray);
        BufferedImage binary = binarize(sharpened);
        return binary;
    }

    public static BufferedImage preprocessStandard(BufferedImage input) {
        return preprocess(input);
    }

    public static BufferedImage preprocessHighContrast(BufferedImage input) {
        BufferedImage upscaled = upscaleIfNeeded(input, TARGET_WIDTH);
        BufferedImage gray = toGrayscale(upscaled);
        BufferedImage sharpened = sharpen(gray);

        RescaleOp rescale = new RescaleOp(2.2f, -30, null);
        BufferedImage contrasted = rescale.filter(sharpened, null);

        return resize(contrasted, TARGET_WIDTH);
    }

    public static BufferedImage preprocessInverted(BufferedImage input) {
        BufferedImage upscaled = upscaleIfNeeded(input, TARGET_WIDTH);
        BufferedImage gray = toGrayscale(upscaled);
        BufferedImage inverted = invert(gray);
        BufferedImage contrasted = adaptiveContrast(inverted);

        return resize(contrasted, TARGET_WIDTH);
    }

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

    private static BufferedImage binarize(BufferedImage gray) {
        int threshold = calculateOtsuThreshold(gray);
        int width = gray.getWidth();
        int height = gray.getHeight();
        BufferedImage binary = new BufferedImage(width, height, BufferedImage.TYPE_BYTE_GRAY);

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int pixel = gray.getRaster().getSample(x, y, 0);
                int value = (pixel > threshold) ? 255 : 0;
                binary.getRaster().setSample(x, y, 0, value);
            }
        }

        return binary;
    }

    public static BufferedImage preprocessBinarized(BufferedImage input) {
        BufferedImage upscaled = upscaleIfNeeded(input, TARGET_WIDTH);
        BufferedImage gray = toGrayscale(upscaled);
        BufferedImage sharpened = sharpen(gray);
        BufferedImage binary = binarize(sharpened);

        return resize(binary, TARGET_WIDTH);
    }

    public static BufferedImage preprocessBinarizedInverted(BufferedImage input) {
        BufferedImage upscaled = upscaleIfNeeded(input, TARGET_WIDTH);
        BufferedImage gray = toGrayscale(upscaled);
        BufferedImage sharpened = sharpen(gray);
        BufferedImage binary = binarize(sharpened);
        BufferedImage inverted = invert(binary);

        return resize(inverted, TARGET_WIDTH);
    }

    public static BufferedImage preprocessAdaptiveLocal(BufferedImage input) {
        BufferedImage upscaled = upscaleIfNeeded(input, TARGET_WIDTH);
        BufferedImage gray = toGrayscale(upscaled);
        BufferedImage sharpened = sharpen(gray);
        BufferedImage adaptive = adaptiveLocalThreshold(sharpened, 15);

        return resize(adaptive, TARGET_WIDTH);
    }

    private static BufferedImage adaptiveLocalThreshold(BufferedImage gray, int blockSize) {
        int width = gray.getWidth();
        int height = gray.getHeight();
        BufferedImage result = new BufferedImage(width, height, BufferedImage.TYPE_BYTE_GRAY);

        int halfBlock = blockSize / 2;
        int offset = 10;

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int sum = 0;
                int count = 0;

                for (int dy = -halfBlock; dy <= halfBlock; dy++) {
                    for (int dx = -halfBlock; dx <= halfBlock; dx++) {
                        int nx = x + dx;
                        int ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            sum += gray.getRaster().getSample(nx, ny, 0);
                            count++;
                        }
                    }
                }

                int localMean = sum / count;
                int threshold = localMean - offset;

                int pixel = gray.getRaster().getSample(x, y, 0);
                int value = (pixel > threshold) ? 255 : 0;
                result.getRaster().setSample(x, y, 0, value);
            }
        }

        return result;
    }
}
