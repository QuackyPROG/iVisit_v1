package com.ivisit.backend.controller;

import com.ivisit.backend.model.UserAccount;
import com.ivisit.backend.service.EmailVerificationService;
import com.ivisit.backend.service.UserAccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private EmailVerificationService emailVerificationService;

    @Autowired
    private UserAccountService userAccountService;

    // In the future, refactor all login related things to here!

    @GetMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestParam("token") String token) {
        if (token == null || token.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Collections.singletonMap("error", "Token is required"));
        }

        try {
            UserAccount user = emailVerificationService.verifyToken(token);

            Map<String, Object> response = new HashMap<>();
            response.put("userId", user.getId());
            response.put("email", user.getEmailAddress());
            response.put("emailVerified", user.getEmailVerified());
            response.put("emailVerifiedAt", user.getEmailVerifiedAt());
            response.put("message", "Email verified successfully");

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Collections.singletonMap("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409)
                    .body(Collections.singletonMap("error", e.getMessage()));
        }
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestParam("email") String email) {
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Collections.singletonMap("error", "Email is required"));
        }

        Optional<UserAccount> opt = userAccountService.findByEmail(email);
        if (!opt.isPresent()) {
            return ResponseEntity.status(404)
                    .body(Collections.singletonMap("error", "User not found"));
        }

        UserAccount user = opt.get();

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            return ResponseEntity.badRequest()
                    .body(Collections.singletonMap("error", "Email is already verified"));
        }

        emailVerificationService.createAndSendToken(user);

        return ResponseEntity.ok(
                Collections.singletonMap(
                        "message",
                        "Verification email has been resent if the account exists and is not yet verified"
                )
        );
    }
}
