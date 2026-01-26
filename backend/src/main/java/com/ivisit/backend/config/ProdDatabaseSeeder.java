package com.ivisit.backend.config;

import com.ivisit.backend.model.Station;
import com.ivisit.backend.model.UserAccount;
import com.ivisit.backend.repository.StationRepository;
import com.ivisit.backend.repository.UserAccountRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.sql.Timestamp;
import java.util.Collections;

@Configuration
@Profile("prod")
public class ProdDatabaseSeeder {

    @Value("${app.admin.email:ivisitust2025@gmail.com}")
    private String adminEmail;

    @Value("${app.admin.password:ChangeMe123!}")
    private String adminPassword;

    @Value("${app.admin.username:iVisitUST 2025}")
    private String adminUsername;

    @Bean
    public CommandLineRunner seedProdDatabase(
            StationRepository stationRepository,
            UserAccountRepository userAccountRepository,
            PasswordEncoder passwordEncoder
    ) {
        return args -> {

            // Safety: only seed if there are no user accounts yet (run-once behavior)
            if (userAccountRepository.count() > 0) {
                return;
            }

            // Minimal default station so the system has something to attach to
            Station mainGate = new Station("Main Gate", "GATE", true);
            stationRepository.save(mainGate);

            // Admin account for initial takeover by the client
            // Credentials are now configurable via environment variables
            UserAccount tempAdmin = new UserAccount(
                    adminUsername,                 // username from env
                    null,                          // password (set encoded below)
                    adminEmail,                    // email from env
                    "ADMIN",                       // account type
                    Collections.singletonList(mainGate) // assigned station(s)
            );

            tempAdmin.setPassword(passwordEncoder.encode(adminPassword));
            tempAdmin.setActive(true);
            tempAdmin.setEmailVerified(Boolean.TRUE);
            tempAdmin.setEmailVerifiedAt(new Timestamp(System.currentTimeMillis()));

            userAccountRepository.save(tempAdmin);
        };
    }
}
