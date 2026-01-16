package com.ivisit.helper.utils;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.awt.image.RescaleOp;

public class ImagePreprocessor {

    /**
     * Preprocess the image to improve OCR accuracy:
     * 1. Convert to grayscale
     * 2. Increase contrast
     * 3. Resize to a minimum width if needed
     */
    public static BufferedImage preprocess(BufferedImage input) {
        // 1. Convert to grayscale
        BufferedImage gray = new BufferedImage(
                input.getWidth(), input.getHeight(), BufferedImage.TYPE_BYTE_GRAY);
        Graphics g = gray.getGraphics();
        g.drawImage(input, 0, 0, null);
        g.dispose();

        // 2. Increase contrast
        RescaleOp rescale = new RescaleOp(1.5f, 0, null); // scaleFactor > 1 increases contrast
        BufferedImage contrasted = rescale.filter(gray, null);

        // 3. Resize if width < 1200px (helps OCR - upgraded from 800px)
        int targetWidth = Math.max(contrasted.getWidth(), 1200);
        int targetHeight = (int) ((double) contrasted.getHeight() / contrasted.getWidth() * targetWidth);
        BufferedImage resized = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g2 = resized.createGraphics();
        g2.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g2.drawImage(contrasted, 0, 0, targetWidth, targetHeight, null);
        g2.dispose();

        return resized;
    }
}
