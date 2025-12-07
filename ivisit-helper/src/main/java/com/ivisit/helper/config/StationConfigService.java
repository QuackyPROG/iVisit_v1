package com.ivisit.helper.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Properties;

@Service
public class StationConfigService {

    private final Path configPath;

    // Default from application.properties (fallback)
    private final int defaultStationId;

    // In-memory current value
    private volatile int currentStationId;

    public StationConfigService(
            @Value("${station.id:0}") int defaultStationId,
            @Value("${station.config.path:}") String configPathProp
    ) {
        this.defaultStationId = defaultStationId;

        if (configPathProp != null && !configPathProp.trim().isEmpty()) {
            this.configPath = Paths.get(configPathProp.trim());
        } else {
            // relative to the working directory where the JAR is started
            this.configPath = Paths.get("station-config.properties");
        }
    }

    @PostConstruct
    public void init() {
        // Load from disk if present, otherwise fallback to application.properties
        Integer loaded = loadFromDisk();
        if (loaded != null && loaded > 0) {
            currentStationId = loaded;
        } else {
            currentStationId = defaultStationId;
        }
    }

    public int getStationId() {
        return currentStationId;
    }

    public synchronized void setStationId(int stationId) throws IOException {
        this.currentStationId = stationId;
        saveToDisk(stationId);
    }

    private Integer loadFromDisk() {
        if (!Files.exists(configPath)) {
            return null;
        }

        Properties props = new Properties();
        try (InputStream in = Files.newInputStream(configPath)) {
            props.load(in);
            String raw = props.getProperty("stationId");
            if (raw == null) return null;

            try {
                return Integer.parseInt(raw.trim());
            } catch (NumberFormatException e) {
                return null;
            }
        } catch (IOException e) {
            System.err.println("[StationConfigService] Failed to read " + configPath + ": " + e.getMessage());
            return null;
        }
    }

    private void saveToDisk(int stationId) throws IOException {
        Properties props = new Properties();
        props.setProperty("stationId", Integer.toString(stationId));

        Path parent = configPath.getParent();
        if (parent != null && !Files.exists(parent)) {
            Files.createDirectories(parent);
        }

        try (OutputStream out = Files.newOutputStream(configPath)) {
            props.store(out, "iVisit helper station binding");
        }
    }
}
