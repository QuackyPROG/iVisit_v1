package com.ivisit.backend.service;

import com.ivisit.backend.model.UserAccount;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("dev")
public class DevEmailSenderService implements EmailSenderService {

    @Override
    public void sendEmailVerification(UserAccount user, String verificationLink) {
        System.out.println("DEV EMAIL VERIFICATION to " + user.getEmailAddress());
        System.out.println("Click this link (copy-paste in browser): " + verificationLink);
    }
}
