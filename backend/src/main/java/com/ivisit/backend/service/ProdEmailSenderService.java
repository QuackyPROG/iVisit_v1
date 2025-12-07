package com.ivisit.backend.service;

import com.ivisit.backend.model.UserAccount;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Profile("prod")
public class ProdEmailSenderService implements EmailSenderService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromAddress;

    @Override
    public void sendEmailVerification(UserAccount user, String verificationLink) {
        if (user == null || user.getEmailAddress() == null) {
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(user.getEmailAddress());
        message.setSubject("Verify your iVisit email address");

        StringBuilder body = new StringBuilder();
        body.append("Hello ");
        if (user.getUsername() != null && !user.getUsername().isEmpty()) {
            body.append(user.getUsername());
        } else {
            body.append("User");
        }
        body.append(",\n\n");
        body.append("Please verify your email address for the iVisit User Management Portal by clicking the link below:\n\n");
        body.append(verificationLink).append("\n\n");
        body.append("If you did not request this, you can ignore this message.\n\n");
        body.append("Thank you,\n");
        body.append("iVisit Team");

        message.setText(body.toString());

        mailSender.send(message);
    }
}
