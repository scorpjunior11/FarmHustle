package com.farmhustle.farmhustle_backend.service;

import com.farmhustle.farmhustle_backend.exception.EmailDeliveryException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
@ConditionalOnProperty(name = "email.provider", havingValue = "brevo", matchIfMissing = true)
public class BrevoEmailService implements EmailService {

    private static final String BREVO_BASE_URL = "https://api.brevo.com/v3/smtp/email";

    private final RestTemplate restTemplate = new RestTemplate();
    private final String apiKey;
    private final String senderEmail;

    public BrevoEmailService(@Value("${brevo.api.key}") String apiKey,
                         @Value("${brevo.sender.email}") String senderEmail) {
        this.apiKey = apiKey;
        this.senderEmail = senderEmail;
    }

    public void sendVerificationCode(String toEmail, String code) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("api-key", apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        Map<String, Object> body = Map.of(
                "sender", Map.of("name", "FarmHustle", "email", senderEmail),
                "to", List.of(Map.of("email", toEmail)),
                "subject", "Your FarmHustle verification code",
                "htmlContent", "<p>Your verification code is <strong>" + code + "</strong>. It expires in 15 minutes.</p>");

        try {
            restTemplate.postForEntity(BREVO_BASE_URL, new HttpEntity<>(body, headers), Map.class);
        } catch (RestClientResponseException e) {
            throw new EmailDeliveryException(
                    "Brevo email send failed (" + e.getStatusCode().value() + "): " + e.getResponseBodyAsString());
        } catch (RestClientException e) {
            throw new EmailDeliveryException("Could not reach Brevo: " + e.getMessage());
        }
    }
}
