package com.ivisit.helper.utils;

import java.awt.Rectangle;
import java.util.HashMap;
import java.util.Map;

/**
 * ROI (Region of Interest) templates for ID card field extraction.
 * Coordinates are stored as percentages of image dimensions (0.0 - 1.0).
 */
public class RoiTemplate {

    /**
     * Region definition with percentage coordinates
     */
    public static class Region {
        public final double xPct;
        public final double yPct;
        public final double widthPct;
        public final double heightPct;

        public Region(double xPct, double yPct, double widthPct, double heightPct) {
            this.xPct = xPct;
            this.yPct = yPct;
            this.widthPct = widthPct;
            this.heightPct = heightPct;
        }

        /**
         * Convert percentage coordinates to actual pixel Rectangle
         */
        public Rectangle toRectangle(int imageWidth, int imageHeight) {
            int x = (int) (xPct * imageWidth);
            int y = (int) (yPct * imageHeight);
            int w = (int) (widthPct * imageWidth);
            int h = (int) (heightPct * imageHeight);
            return new Rectangle(x, y, w, h);
        }
    }

    // ========== TEMPLATES ==========

    /**
     * Driver's License (Philippine LTO) - Standard layout
     */
    public static Map<String, Region> getDriversLicenseTemplate() {
        Map<String, Region> regions = new HashMap<>();
        // Name: Upper right area (35% from left, 23% from top)
        regions.put("name", new Region(0.35, 0.23, 0.55, 0.08));
        // License Number: Middle left area
        regions.put("idNumber", new Region(0.20, 0.48, 0.30, 0.08));
        // DOB: Middle area
        regions.put("dob", new Region(0.50, 0.28, 0.18, 0.06));
        // Address: Below name
        regions.put("address", new Region(0.35, 0.35, 0.55, 0.12));
        return regions;
    }

    /**
     * SSS ID - Standard layout
     */
    public static Map<String, Region> getSSSIdTemplate() {
        Map<String, Region> regions = new HashMap<>();
        // Name: Center area
        regions.put("name", new Region(0.25, 0.35, 0.55, 0.12));
        // SSS Number: Below name
        regions.put("idNumber", new Region(0.25, 0.50, 0.40, 0.12));
        return regions;
    }

    /**
     * National ID (PhilSys) - Standard layout
     */
    public static Map<String, Region> getNationalIdTemplate() {
        Map<String, Region> regions = new HashMap<>();
        // Full Name: Middle right
        regions.put("name", new Region(0.35, 0.55, 0.60, 0.10));
        // PSN (ID Number): Upper middle
        regions.put("idNumber", new Region(0.35, 0.35, 0.60, 0.08));
        // DOB: Lower area
        regions.put("dob", new Region(0.35, 0.70, 0.30, 0.08));
        return regions;
    }

    /**
     * UMID - Similar to National ID with different proportions
     */
    public static Map<String, Region> getUMIDTemplate() {
        Map<String, Region> regions = new HashMap<>();
        // Surname, Given Name, Middle Name
        regions.put("name", new Region(0.40, 0.30, 0.55, 0.20));
        // CRN Number
        regions.put("idNumber", new Region(0.40, 0.20, 0.40, 0.08));
        // DOB
        regions.put("dob", new Region(0.40, 0.55, 0.25, 0.06));
        // Address
        regions.put("address", new Region(0.40, 0.62, 0.55, 0.15));
        return regions;
    }

    /**
     * Get template for a given ID type
     */
    public static Map<String, Region> getTemplate(String idType) {
        if (idType == null)
            return null;

        switch (idType.toLowerCase()) {
            case "driver's license":
            case "drivers license":
                return getDriversLicenseTemplate();
            case "sss id":
                return getSSSIdTemplate();
            case "national id":
                return getNationalIdTemplate();
            case "umid":
                return getUMIDTemplate();
            default:
                return null;
        }
    }
}
