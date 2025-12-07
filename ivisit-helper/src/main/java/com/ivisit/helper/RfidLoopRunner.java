package com.ivisit.helper;

import com.ivisit.helper.sender.RfidSender;
import com.ivisit.helper.service.RfidService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import javax.smartcardio.CardException;

@Component
public class RfidLoopRunner implements CommandLineRunner {

    private final RfidService rfidService;
    private final RfidSender rfidSender;

    // tracking consecutive scanner-level failures
    private int consecutiveScannerErrors = 0;

    public RfidLoopRunner(RfidService rfidService, RfidSender rfidSender) {
        this.rfidService = rfidService;
        this.rfidSender = rfidSender;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("iVisit-helper RFID loop is running...");

        while (true) {
            try {
                System.out.println("Waiting for card...");
                String uid = rfidService.readCardUID(10_000); // 10 seconds

                if (uid != null) {
                    System.out.println("Card detected. UID = " + uid);
                    rfidSender.sendScan(uid);

                    // SUCCESS -> reset error counter
                    consecutiveScannerErrors = 0;
                } else {
                    System.out.println("No UID read (possibly unsupported card).");

                    // "No card" is not a scanner failure; also reset the counter
                    consecutiveScannerErrors = 0;
                }
            } catch (Exception e) {
                String msg = e.getMessage();
                System.err.println("Error reading card: " + msg);

                if (isScannerFatalError(e)) {
                    consecutiveScannerErrors++;
                    System.err.println(
                            "[RFID] Scanner error " + consecutiveScannerErrors + "/5: " + safeMessage(msg)
                    );

                    if (consecutiveScannerErrors >= 5) {
                        System.err.println(
                                "[RFID] Too many consecutive scanner-level errors. " +
                                        "Exiting helper so wrapper script can restart it."
                        );
                        // Let the .bat / service restart the process
                        System.exit(2);
                    }
                } else {
                    // Non-scanner error -> don't count towards restart
                    consecutiveScannerErrors = 0;
                }
            }

            // small delay to avoid tight loop if something goes wrong
            Thread.sleep(1000);
        }
    }

    /**
     * Decide if this looks like a scanner / driver level problem
     * (PC/SC, terminals missing, etc.), not just normal “no card” behavior.
     */
    private boolean isScannerFatalError(Exception e) {
        // Explicit smartcard exception
        if (e instanceof CardException) {
            return true;
        }

        String msg = safeMessage(e.getMessage()).toLowerCase();

        // Common cases:
        // - "No card terminals found" (your IllegalStateException)
        // - "list() failed" from PC/SC
        if (msg.contains("no card terminals found")) return true;
        if (msg.contains("list() failed")) return true;
        if (msg.contains("scard") && msg.contains("error")) return true;

        return false;
    }

    private String safeMessage(String msg) {
        return msg == null ? "(no message)" : msg;
    }
}
