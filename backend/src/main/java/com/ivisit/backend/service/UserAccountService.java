package com.ivisit.backend.service;

import com.ivisit.backend.model.UserAccount;
import com.ivisit.backend.model.Station;
import com.ivisit.backend.repository.UserAccountRepository;
import com.ivisit.backend.repository.StationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Optional;

@Service
public class UserAccountService {

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private StationRepository stationRepository;

    @Autowired
    private EmailVerificationService emailVerificationService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public List<UserAccount> getAllUsers() {
        return userAccountRepository.findAll();
    }

    public Page<UserAccount> getAllUsersPaged(int page, int size) {
        if (page < 0) page = 0;
        if (size <= 0) size = 20;

        PageRequest pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by("accountID"))
        );

        return userAccountRepository.findAll(pageable);
    }

    public Optional<UserAccount> getUserById(Long id) {
        return userAccountRepository.findById(id);
    }

    public UserAccount createUser(UserAccount user) {
        if (userAccountRepository.existsByUsername(user.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        if (userAccountRepository.existsByEmailAddress(user.getEmailAddress())) {
            throw new RuntimeException("Email already exists");
        }

        if (user.getPassword() != null && !user.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }

        user.setEmailVerified(false);
        user.setEmailVerifiedAt(null);

        UserAccount saved = userAccountRepository.save(user);

        emailVerificationService.createAndSendToken(saved);

        return saved;
    }

    public UserAccount updateUser(Long id, UserAccount updatedUser) {
        Optional<UserAccount> existingOpt = userAccountRepository.findById(id);
        if (!existingOpt.isPresent()) {
            throw new RuntimeException("User not found");
        }

        UserAccount existing = existingOpt.get();

        String oldEmail = existing.getEmailAddress();
        boolean emailChanged = false;

        if (updatedUser.getUsername() != null) {
            existing.setUsername(updatedUser.getUsername());
        }
        if (updatedUser.getPassword() != null && !updatedUser.getPassword().isEmpty()) {
            existing.setPassword(passwordEncoder.encode(updatedUser.getPassword()));
        }
        if (updatedUser.getEmailAddress() != null) {
            String newEmail = updatedUser.getEmailAddress();
            if (oldEmail == null || !oldEmail.equalsIgnoreCase(newEmail)) {
                existing.setEmailAddress(newEmail);
                existing.setEmailVerified(false);
                existing.setEmailVerifiedAt(null);
                emailChanged = true;
            }
        }
        if (updatedUser.getAccountType() != null) {
            existing.setAccountType(updatedUser.getAccountType());
        }
        if (updatedUser.getAssignedStations() != null) {
            existing.setAssignedStations(updatedUser.getAssignedStations());
        }
        if (updatedUser.getActive() != null) {
            existing.setActive(updatedUser.getActive());
        }

        UserAccount saved = userAccountRepository.save(existing);

        if (emailChanged) {
            emailVerificationService.createAndSendToken(saved);
        }

        return saved;
    }

    public void deleteUser(Long id) {
        if (!userAccountRepository.existsById(id)) {
            throw new RuntimeException("User not found");
        }
        userAccountRepository.deleteById(id);
    }

    public UserAccount assignStation(Long userId, Long stationId) {
        Optional<UserAccount> userOpt = userAccountRepository.findById(userId);
        Optional<Station> stationOpt = stationRepository.findById(stationId);

        if (!userOpt.isPresent() || !stationOpt.isPresent()) {
            throw new RuntimeException("User or Station not found");
        }

        UserAccount user = userOpt.get();
        Station station = stationOpt.get();
        user.getAssignedStations().add(station);
        return userAccountRepository.save(user);
    }

    public Optional<UserAccount> findByEmail(String email) {
        if (email == null) return Optional.empty();
        return userAccountRepository.findAll()
                .stream()
                .filter(u -> email.equalsIgnoreCase(u.getEmailAddress()))
                .findFirst();
    }

    public boolean checkPassword(UserAccount user, String rawPassword) {
        if (user.getPassword() == null || rawPassword == null) return false;
        return passwordEncoder.matches(rawPassword, user.getPassword());
    }

    public UserAccount resetPassword(Long id, String newPassword) {
        Optional<UserAccount> userOpt = userAccountRepository.findById(id);
        if (!userOpt.isPresent()) {
            throw new RuntimeException("User not found");
        }

        UserAccount user = userOpt.get();

        if (newPassword != null && !newPassword.isEmpty()) {
            user.setPassword(passwordEncoder.encode(newPassword));
        }

        user.setTwoFactorEnabled(false);
        user.setTotpSecret(null);

        return userAccountRepository.save(user);
    }

    public UserAccount unassignStation(Long userId, Long stationId) {
        Optional<UserAccount> userOpt = userAccountRepository.findById(userId);
        Optional<Station> stationOpt = stationRepository.findById(stationId);

        if (!userOpt.isPresent() || !stationOpt.isPresent()) {
            throw new RuntimeException("User or Station not found");
        }

        UserAccount user = userOpt.get();
        Station station = stationOpt.get();

        if (user.getAssignedStations() != null) {
            user.getAssignedStations().removeIf(st -> st.getId().equals(station.getId()));
        }

        return userAccountRepository.save(user);
    }

    public Page<UserAccount> searchUsersPaged(String q, int page, int size) {
        if (page < 0) {
            page = 0;
        }
        if (size <= 0) {
            size = 20;
        }

        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt")
                .and(Sort.by("accountID"));

        Pageable pageable = PageRequest.of(page, size, sort);

        if (q == null || q.trim().isEmpty()) {
            return userAccountRepository.findAll(pageable);
        }

        return userAccountRepository.searchByKeyword(q.trim(), pageable);
    }

    public UserAccount saveUser(UserAccount user) {
        return userAccountRepository.save(user);
    }
}
