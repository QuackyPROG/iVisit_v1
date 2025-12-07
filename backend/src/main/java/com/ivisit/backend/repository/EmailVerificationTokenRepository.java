package com.ivisit.backend.repository;

import com.ivisit.backend.model.EmailVerificationToken;
import com.ivisit.backend.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {

    Optional<EmailVerificationToken> findByToken(String token);

    List<EmailVerificationToken> findByUserAndUsedIsFalse(UserAccount user);
}
