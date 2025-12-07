package com.ivisit.backend.repository;

import com.ivisit.backend.model.UserAccount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {
    UserAccount findByUsername(String username);
    Optional<UserAccount> findByEmailAddress(String emailAddress);
    boolean existsByUsername(String username);
    boolean existsByEmailAddress(String emailAddress);

    @Query("SELECT u FROM UserAccount u " +
            "WHERE LOWER(u.username) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "   OR LOWER(u.emailAddress) LIKE LOWER(CONCAT('%', :q, '%')) " +
            "   OR LOWER(u.accountType) LIKE LOWER(CONCAT('%', :q, '%'))")
    Page<UserAccount> searchByKeyword(@Param("q") String q, Pageable pageable);
}
