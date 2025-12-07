package com.ivisit.backend.config;

import com.ivisit.backend.model.Station;
import com.ivisit.backend.model.UserAccount;
import com.ivisit.backend.repository.StationRepository;
import com.ivisit.backend.repository.UserAccountRepository;
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

            // Temporary admin account for initial takeover by the client
            UserAccount tempAdmin = new UserAccount(
                    "iVisitUST 2025",              // username
                    null,                      // password (set encoded below)
                    "ivisitust2025@gmail.com",  // email (change as needed)
                    "ADMIN",                   // account type
                    Collections.singletonList(mainGate) // assigned station(s)
            );

            tempAdmin.setPassword(passwordEncoder.encode("ChangeMe123!"));
            tempAdmin.setActive(true);
            tempAdmin.setEmailVerified(Boolean.TRUE);
            tempAdmin.setEmailVerifiedAt(new Timestamp(System.currentTimeMillis()));

            userAccountRepository.save(tempAdmin);
        };
    }
}
