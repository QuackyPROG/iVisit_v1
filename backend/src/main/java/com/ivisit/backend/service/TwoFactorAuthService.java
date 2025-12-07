package com.ivisit.backend.service;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import org.springframework.stereotype.Service;

@Service
public class TwoFactorAuthService {

    private final GoogleAuthenticator gAuth = new GoogleAuthenticator();

    public String generateSecret() {
        GoogleAuthenticatorKey key = gAuth.createCredentials();
        return key.getKey();
    }

    public boolean verifyCode(String secret, int code) {
        return gAuth.authorize(secret, code);
    }

    /**
     * Build otpauth URL that Google Authenticator can scan.
     * issuer = app name (e.g. "iVisit"), accountName = user email/username.
     */
    public String buildOtpAuthUrl(String issuer, String accountName, String secret) {
        // Standard otpauth URI format
        // otpauth://totp/{issuer}:{accountName}?secret={secret}&issuer={issuer}
        return String.format(
                "otpauth://totp/%s:%s?secret=%s&issuer=%s",
                urlEncode(issuer),
                urlEncode(accountName),
                secret,
                urlEncode(issuer)
        );
    }

    private String urlEncode(String s) {
        try {
            return java.net.URLEncoder.encode(s, "UTF-8").replace("+", "%20");
        } catch (Exception e) {
            return s;
        }
    }
}
