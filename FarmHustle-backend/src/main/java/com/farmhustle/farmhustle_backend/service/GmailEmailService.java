package com.farmhustle.farmhustle_backend.service;

import com.farmhustle.farmhustle_backend.exception.EmailDeliveryException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "email.provider", havingValue = "gmail")
public class GmailEmailService implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(GmailEmailService.class);

    private final JavaMailSender mailSender;
    private final String fromAddress;

    public GmailEmailService(JavaMailSender mailSender,
                              @Value("${spring.mail.username}") String fromAddress) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
    }

    @Override
    public void sendVerificationCode(String toEmail, String code) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            // Gmail rewrites the From header to the authenticated account regardless
            // of what's set here, so this is set for clarity/consistency, not control.
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(toEmail);
            helper.setSubject("Your FarmHustle verification code");
            helper.setText(
                    "<p>Your verification code is <strong>" + code + "</strong>. It expires in 15 minutes.</p>",
                    true);
            mailSender.send(message);
            log.info("Verification email sent via Gmail SMTP to {}", toEmail);
        } catch (MessagingException | MailException e) {
            log.error("Gmail SMTP send failed for {}: {}", toEmail, e.getMessage(), e);
            throw new EmailDeliveryException("Gmail SMTP send failed: " + e.getMessage());
        }
    }
}
