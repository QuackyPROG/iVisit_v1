package com.ivisit.backend.config;

import com.ivisit.backend.model.*;
import com.ivisit.backend.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

@Configuration
@Profile("dev")
public class DatabaseSeeder {

    @Bean
    public CommandLineRunner seedDatabase(
            StationRepository stationRepository,
            UserAccountRepository userAccountRepository,
            VisitorRepository visitorRepository,
            VisitorPassRepository visitorPassRepository,
            VisitorLogRepository visitorLogRepository,
            VisitorLogEntryRepository visitorLogEntryRepository,
            PasswordEncoder passwordEncoder
    ) {
        return args -> {

            if (stationRepository.count() > 0) {
                return;
            }

            // Stations
            Station gate1 = new Station("Gate 1", "GATE", true);
            Station gate2 = new Station("Gate 2", "GATE", true);
            Station mainLobby = new Station("Main Lobby", "BUILDING", true);
            Station parkingArea = new Station("Parking Area", "BUILDING", true);

            stationRepository.saveAll(Arrays.asList(gate1, gate2, mainLobby, parkingArea));

            // Users
            UserAccount admin = new UserAccount(
                    "admin",
                    null,
                    "admin@email.com",
                    "ADMIN",
                    Collections.emptyList()
            );
            admin.setPassword(passwordEncoder.encode("password"));
            admin.setActive(true);

            UserAccount support = new UserAccount(
                    "support",
                    null,
                    "support@email.com",
                    "SUPPORT",
                    Collections.emptyList()
            );
            support.setPassword(passwordEncoder.encode("password"));
            support.setActive(true);

            UserAccount guardGate1 = new UserAccount(
                    "guard_gate1",
                    null,
                    "guard_gate1@email.com",
                    "GUARD",
                    Collections.singletonList(gate1)
            );
            guardGate1.setPassword(passwordEncoder.encode("password"));
            guardGate1.setActive(true);

            UserAccount guardGate2 = new UserAccount(
                    "guard_gate2",
                    null,
                    "guard_gate2@email.com",
                    "GUARD",
                    Collections.singletonList(gate2)
            );
            guardGate2.setPassword(passwordEncoder.encode("password"));
            guardGate2.setActive(true);

            UserAccount guardLobbyParking = new UserAccount(
                    "guard_lobby_parking",
                    null,
                    "guard_lp@email.com",
                    "GUARD",
                    Arrays.asList(mainLobby, parkingArea)
            );
            guardLobbyParking.setPassword(passwordEncoder.encode("password"));
            guardLobbyParking.setActive(true);

            userAccountRepository.saveAll(
                    Arrays.asList(admin, support, guardGate1, guardGate2, guardLobbyParking)
            );

            // Visitor passes
            VisitorPass pass1 = new VisitorPass("865A4BA6", "RFID-1001", "IN_USE");
            pass1.setDisplayCode("001");
            pass1.setOriginLocation("Gate 1");

            VisitorPass pass2 = new VisitorPass("865A4BA7", "RFID-1002", "AVAILABLE");
            pass2.setDisplayCode("002");
            pass2.setOriginLocation("Gate 2");

            VisitorPass pass3 = new VisitorPass("865A4BA8", "RFID-1003", "AVAILABLE");
            pass3.setDisplayCode("003");
            pass3.setOriginLocation("Main Lobby");

            visitorPassRepository.saveAll(Arrays.asList(pass1, pass2, pass3));

            // Visitors
            java.util.function.Function<LocalDate, Date> toDate = ld ->
                    Date.from(ld.atStartOfDay(ZoneId.systemDefault()).toInstant());

            Visitor v1 = new Visitor(
                    "Juan Dela Cruz",
                    "Guest",
                    "NATIONAL_ID",
                    "ID-123456",
                    toDate.apply(LocalDate.of(1995, 5, 10)),
                    Timestamp.valueOf(LocalDateTime.now().minusHours(2))
            );

            Visitor v2 = new Visitor(
                    "Maria Santos",
                    "Contractor",
                    "DRIVER_LICENSE",
                    "DL-789012",
                    toDate.apply(LocalDate.of(1990, 11, 3)),
                    Timestamp.valueOf(LocalDateTime.now().minusHours(3))
            );

            Visitor v3 = new Visitor(
                    "ABC Corp Representative",
                    "Supplier",
                    "COMPANY_ID",
                    "COMP-555",
                    toDate.apply(LocalDate.of(1985, 1, 1)),
                    Timestamp.valueOf(LocalDateTime.now().minusDays(1))
            );

            visitorRepository.saveAll(Arrays.asList(v1, v2, v3));

            // Logs
            Timestamp now = Timestamp.valueOf(LocalDateTime.now());

            Timestamp startActive = Timestamp.valueOf(LocalDateTime.now().minusMinutes(45));
            VisitorLog activeLog = new VisitorLog(v1, pass1, startActive, null);

            Timestamp startCompleted = Timestamp.valueOf(LocalDateTime.now().minusHours(2));
            Timestamp endCompleted = Timestamp.valueOf(LocalDateTime.now().minusMinutes(10));
            VisitorLog completedLog = new VisitorLog(v2, pass2, startCompleted, endCompleted);

            activeLog.setAllowedStations(Arrays.asList(gate1, mainLobby, parkingArea));
            completedLog.setAllowedStations(Collections.singletonList(gate2));

            visitorLogRepository.saveAll(Arrays.asList(activeLog, completedLog));

            // Entries
            UserAccount guard1 = userAccountRepository.findByUsername("guard_gate1");
            UserAccount guard2 = userAccountRepository.findByUsername("guard_gate2");
            UserAccount guardLP = userAccountRepository.findByUsername("guard_lobby_parking");

            VisitorLogEntry entry1 = new VisitorLogEntry(
                    activeLog,
                    gate1,
                    guard1,
                    Timestamp.valueOf(LocalDateTime.now().minusMinutes(40))
            );

            VisitorLogEntry entry2 = new VisitorLogEntry(
                    activeLog,
                    mainLobby,
                    guardLP,
                    Timestamp.valueOf(LocalDateTime.now().minusMinutes(10))
            );

            VisitorLogEntry entry3 = new VisitorLogEntry(
                    completedLog,
                    gate2,
                    guard2,
                    Timestamp.valueOf(LocalDateTime.now().minusHours(1))
            );

            activeLog.setVisitorLogEntries(Arrays.asList(entry1, entry2));
            completedLog.setVisitorLogEntries(Collections.singletonList(entry3));

            visitorLogRepository.save(activeLog);
            visitorLogRepository.save(completedLog);
        };
    }
}
