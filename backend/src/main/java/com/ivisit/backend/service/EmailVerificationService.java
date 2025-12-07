package com.ivisit.backend.service;

import com.ivisit.backend.model.EmailVerificationToken;
import com.ivisit.backend.model.UserAccount;
import com.ivisit.backend.repository.EmailVerificationTokenRepository;
import com.ivisit.backend.repository.UserAccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

@Service
public class EmailVerificationService {

    @Autowired
    private EmailVerificationTokenRepository tokenRepository;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired(required = false)
    private EmailSenderService emailSenderService;

    @Value("${app.frontend-base-url}")
    private String frontendBaseUrl;

    public void createAndSendToken(UserAccount user) {
        tokenRepository.findByUserAndUsedIsFalse(user).forEach(t -> {
            t.setUsed(true);
            tokenRepository.save(t);
        });

        String tokenValue = UUID.randomUUID().toString();

        EmailVerificationToken token = new EmailVerificationToken();
        token.setToken(tokenValue);
        token.setUser(user);
        token.setExpiresAt(Timestamp.from(Instant.now().plus(24, ChronoUnit.HOURS)));
        token.setUsed(false);
        tokenRepository.save(token);

        if (emailSenderService != null) {
            String verificationLink = buildVerificationLink(tokenValue);
            emailSenderService.sendEmailVerification(user, verificationLink);
        }
    }

    public UserAccount verifyToken(String tokenValue) {
        Optional<EmailVerificationToken> opt = tokenRepository.findByToken(tokenValue);
        if (!opt.isPresent()) {
            throw new IllegalArgumentException("Invalid verification token");
        }

        EmailVerificationToken token = opt.get();
        UserAccount user = token.getUser();
        Timestamp now = new Timestamp(System.currentTimeMillis());

        // If token was already used
        if (Boolean.TRUE.equals(token.getUsed())) {
            // If user is already verified, treat this as idempotent success
            if (Boolean.TRUE.equals(user.getEmailVerified())) {
                return user;
            }
            // Otherwise, something is off: token used but user not verified
            throw new IllegalStateException("Verification token already used");
        }

        // If token is expired
        if (token.getExpiresAt() != null && token.getExpiresAt().before(now)) {
            // If user is already verified, again treat as success
            if (Boolean.TRUE.equals(user.getEmailVerified())) {
                return user;
            }
            throw new IllegalStateException("Verification token has expired");
        }

        // Normal case: token is valid, not used, not expired -> verify user now
        user.setEmailVerified(true);
        user.setEmailVerifiedAt(now);
        userAccountRepository.save(user);

        token.setUsed(true);
        tokenRepository.save(token);

        return user;
    }

    private String buildVerificationLink(String tokenValue) {
        return frontendBaseUrl + "/verify-email?token=" + tokenValue;
    }
}
