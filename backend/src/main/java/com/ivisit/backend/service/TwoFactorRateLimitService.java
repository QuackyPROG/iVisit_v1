// src/main/java/com/ivisit/backend/service/TwoFactorRateLimitService.java
package com.ivisit.backend.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TwoFactorRateLimitService {

    private static final int MAX_ATTEMPTS = 5;
    private static final long WINDOW_MS = 5 * 60 * 1000L; // 5 minutes

    private static class AttemptWindow {
        int count;
        long windowStartMs;

        AttemptWindow(int count, long windowStartMs) {
            this.count = count;
            this.windowStartMs = windowStartMs;
        }
    }

    private final Map<Long, AttemptWindow> attempts = new ConcurrentHashMap<>();

    /**
     * Returns true if this user is currently blocked due to too many bad codes.
     */
    public boolean isBlocked(Long userId) {
        if (userId == null) return false;
        AttemptWindow window = attempts.get(userId);
        if (window == null) return false;

        long now = System.currentTimeMillis();
        if (now - window.windowStartMs > WINDOW_MS) {
            // window expired, reset
            attempts.remove(userId);
            return false;
        }

        return window.count >= MAX_ATTEMPTS;
    }

    /**
     * Record a failed 2FA attempt.
     */
    public void recordFailure(Long userId) {
        if (userId == null) return;

        long now = System.currentTimeMillis();
        attempts.compute(userId, (id, window) -> {
            if (window == null || now - window.windowStartMs > WINDOW_MS) {
                // start a new window
                return new AttemptWindow(1, now);
            } else {
                window.count += 1;
                return window;
            }
        });
    }

    /**
     * Reset counters, e.g., on successful verification.
     */
    public void reset(Long userId) {
        if (userId == null) return;
        attempts.remove(userId);
    }
}
