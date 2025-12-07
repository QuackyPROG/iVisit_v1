package com.ivisit.backend.controller;

import com.ivisit.backend.dto.LoginRequest;
import com.ivisit.backend.dto.UserAccountDTO;
import com.ivisit.backend.dto.ResetCredentialsRequest;
import com.ivisit.backend.dto.TwoFactorVerifyRequest;
import com.ivisit.backend.mapper.EntityDtoMapper;
import com.ivisit.backend.model.UserAccount;
import com.ivisit.backend.service.UserAccountService;
import com.ivisit.backend.service.TwoFactorAuthService;
import com.ivisit.backend.service.TwoFactorRateLimitService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.RequestParam;

import javax.validation.Valid;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserAccountController {

    @Autowired
    private UserAccountService userAccountService;

    @Autowired
    private TwoFactorAuthService twoFactorAuthService;

    @Autowired
    private TwoFactorRateLimitService twoFactorRateLimitService;

    @PostMapping("/{userId}/assign-station/{stationId}")
    public ResponseEntity<?> assignStation(@PathVariable Long userId,
                                           @PathVariable Long stationId) {
        try {
            UserAccount user = userAccountService.assignStation(userId, stationId);
            UserAccountDTO dto = EntityDtoMapper.toUserAccountDTO(user);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@Valid @RequestBody LoginRequest request) {

        String email = request.getEmail();
        String password = request.getPassword();
        Long stationId = request.getStationId();

        Optional<UserAccount> optionalUser = userAccountService.findByEmail(email);
        if (!optionalUser.isPresent()) {
            return ResponseEntity.status(404)
                    .body(Collections.singletonMap("error", "User not found."));
        }

        UserAccount user = optionalUser.get();

        if (user.getActive() != null && !user.getActive()) {
            return ResponseEntity.status(403)
                    .body(Collections.singletonMap("error", "Your account is deactivated. Please contact an administrator."));
        }

        if (!userAccountService.checkPassword(user, password)) {
            return ResponseEntity.status(401)
                    .body(Collections.singletonMap("error", "Invalid credentials."));
        }

        if (user.getEmailVerified() == null || !user.getEmailVerified()) {
            Map<String, Object> response = new HashMap<>();
            response.put("error", "Your email address is not verified. Please check your inbox.");
            response.put("emailNotVerified", true);
            response.put("email", user.getEmailAddress());
            return ResponseEntity.status(403).body(response);
        }

        if ("GUARD".equalsIgnoreCase(user.getAccountType())) {

            if (stationId == null) {
                return ResponseEntity.status(400)
                        .body(Collections.singletonMap(
                                "error",
                                "This device is not linked to any station. " +
                                        "Please make sure the helper app is running."
                        ));
            }

            boolean assigned =
                    user.getAssignedStations() != null &&
                            user.getAssignedStations().stream()
                                    .anyMatch(st -> stationId.equals(st.getId()));

            if (!assigned) {
                return ResponseEntity.status(403)
                        .body(Collections.singletonMap(
                                "error",
                                "You are not assigned to this station."
                        ));
            }
        }

        if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            Map<String, Object> response = new HashMap<>();
            response.put("userId", user.getId());
            response.put("email", user.getEmailAddress());
            response.put("twoFactorRequired", true);
            if (stationId != null) response.put("stationId", stationId);
            response.put("message", "2FA code required");
            return ResponseEntity.ok(response);
        }

        if (user.getTotpSecret() == null || user.getTotpSecret().isEmpty()) {
            String secret = twoFactorAuthService.generateSecret();
            user.setTotpSecret(secret);
            user.setTwoFactorEnabled(false);
            userAccountService.saveUser(user);

            String issuer = "iVisit";
            String accountName = user.getEmailAddress() != null
                    ? user.getEmailAddress()
                    : user.getUsername();

            String otpauthUrl = twoFactorAuthService.buildOtpAuthUrl(issuer, accountName, secret);

            Map<String, Object> response = new HashMap<>();
            response.put("userId", user.getId());
            response.put("email", user.getEmailAddress());
            response.put("twoFactorSetupRequired", true);
            response.put("otpauthUrl", otpauthUrl);
            if (stationId != null) response.put("stationId", stationId);
            response.put("message", "2FA setup required");
            return ResponseEntity.ok(response);
        }

        String secret = user.getTotpSecret();

        if (secret == null || secret.isEmpty()) {
            secret = twoFactorAuthService.generateSecret();
            user.setTotpSecret(secret);
            user.setTwoFactorEnabled(false);
            userAccountService.saveUser(user);
        }

        String issuer = "iVisit";
        String accountName = user.getEmailAddress() != null
                ? user.getEmailAddress()
                : user.getUsername();

        String otpauthUrl = twoFactorAuthService.buildOtpAuthUrl(issuer, accountName, secret);

        Map<String, Object> response = new HashMap<>();
        response.put("userId", user.getId());
        response.put("email", user.getEmailAddress());
        response.put("twoFactorSetupRequired", true);
        response.put("otpauthUrl", otpauthUrl);
        if (stationId != null) response.put("stationId", stationId);
        response.put("message", "2FA setup required");
        return ResponseEntity.ok(response);

    }

    @PostMapping("/verify-2fa")
    public ResponseEntity<?> verifyTwoFactor(@RequestBody TwoFactorVerifyRequest request) {
        Long userId = request.getUserId();
        Integer code = request.getCode();
        Long stationId = request.getStationId();

        if (userId == null || code == null) {
            return ResponseEntity.badRequest()
                    .body(Collections.singletonMap("error", "userId and code are required"));
        }

        if (twoFactorRateLimitService.isBlocked(userId)) {
            return ResponseEntity.status(429)
                    .body(Collections.singletonMap(
                            "error",
                            "Too many invalid 2FA attempts. Please wait a few minutes and try again."
                    ));
        }

        Optional<UserAccount> opt = userAccountService.getUserById(userId);
        if (!opt.isPresent()) {
            return ResponseEntity.status(404)
                    .body(Collections.singletonMap("error", "User not found."));
        }

        UserAccount user = opt.get();

        if (user.getTotpSecret() == null || user.getTotpSecret().isEmpty()) {
            return ResponseEntity.status(400)
                    .body(Collections.singletonMap("error", "2FA is not set up for this user."));
        }

        boolean ok = twoFactorAuthService.verifyCode(user.getTotpSecret(), code);
        if (!ok) {
            twoFactorRateLimitService.recordFailure(userId);
            return ResponseEntity.status(401)
                    .body(Collections.singletonMap("error", "Invalid 2FA code."));
        }

        twoFactorRateLimitService.reset(userId);

        if (!Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            user.setTwoFactorEnabled(true);
            userAccountService.saveUser(user);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("userId", user.getId());
        response.put("username", user.getUsername());
        response.put("email", user.getEmailAddress());
        response.put("accountType", user.getAccountType());
        response.put("message", "Login successful");
        if (stationId != null) {
            response.put("stationId", stationId);
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<?> getAllUsers(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size,
            @RequestParam(value = "q", required = false) String q
    ) {
        int pageIndex = (page != null && page.intValue() >= 0) ? page.intValue() : 0;
        int pageSize = (size != null && size.intValue() > 0) ? size.intValue() : 25;

        Page<UserAccount> pageResult =
                userAccountService.searchUsersPaged(q, pageIndex, pageSize);

        List<UserAccountDTO> dtos = pageResult.getContent().stream()
                .map(EntityDtoMapper::toUserAccountDTO)
                .collect(Collectors.toList());

        Map<String, Object> body = new HashMap<String, Object>();
        body.put("content", dtos);
        body.put("page", pageResult.getNumber());
        body.put("size", pageResult.getSize());
        body.put("totalElements", pageResult.getTotalElements());
        body.put("totalPages", pageResult.getTotalPages());

        return ResponseEntity.ok(body);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        Optional<UserAccount> opt = userAccountService.getUserById(id);
        if (!opt.isPresent()) {
            return ResponseEntity.badRequest().body("User not found");
        }
        UserAccountDTO dto = EntityDtoMapper.toUserAccountDTO(opt.get());
        return ResponseEntity.ok(dto);
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody UserAccount user) {
        try {
            UserAccount saved = userAccountService.createUser(user);
            UserAccountDTO dto = EntityDtoMapper.toUserAccountDTO(saved);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id,
                                        @RequestBody UserAccount updatedUser) {
        try {
            UserAccount saved = userAccountService.updateUser(id, updatedUser);
            UserAccountDTO dto = EntityDtoMapper.toUserAccountDTO(saved);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        try {
            userAccountService.deleteUser(id);
            return ResponseEntity.ok("User deleted successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/reset-credentials")
    public ResponseEntity<?> resetCredentials(
            @PathVariable Long id,
            @RequestBody ResetCredentialsRequest request
    ) {
        try {
            if (request.getNewPassword() == null || request.getNewPassword().isEmpty()) {
                return ResponseEntity.badRequest().body("New password is required");
            }

            UserAccount updated = userAccountService.resetPassword(id, request.getNewPassword());
            UserAccountDTO dto = EntityDtoMapper.toUserAccountDTO(updated);
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/reset-2fa")
    public ResponseEntity<?> resetTwoFactor(@PathVariable Long id) {
        Optional<UserAccount> opt = userAccountService.getUserById(id);
        if (!opt.isPresent()) {
            return ResponseEntity.badRequest().body("User not found");
        }

        UserAccount user = opt.get();
        user.setTotpSecret(null);
        user.setTwoFactorEnabled(false);
        userAccountService.saveUser(user);

        return ResponseEntity.ok("2FA reset for user");
    }

}
