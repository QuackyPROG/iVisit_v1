package com.ivisit.backend.service;

import com.ivisit.backend.model.UserAccount;

public interface EmailSenderService {
    void sendEmailVerification(UserAccount user, String verificationLink);
}
