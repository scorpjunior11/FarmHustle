package com.farmhustle.farmhustle_backend.service;

public interface EmailService {

    void sendVerificationCode(String toEmail, String code);
}
