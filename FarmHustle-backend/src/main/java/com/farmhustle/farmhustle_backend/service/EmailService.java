package com.farmhustle.farmhustle_backend.service;

import org.springframework.beans.factory.annotation.Value;
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
public class EmailService {

    private static final String RESEND_BASE_URL = "https://api.resend.com/emails";

    private final RestTemplate restTemplate = new RestTemplate();
    private final String apiKey;

    public EmailService(@Value("${resend.api.key}") String apiKey) {
        this.apiKey = apiKey;
    }

    public void sendVerificationCode(String toEmail, String code) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
                "from", "FarmHustle <onboarding@resend.dev>",
                "to", List.of(toEmail),
                "subject", "Your FarmHustle verification code",
                "html", "<p>Your verification code is <strong>" + code + "</strong>. It expires in 15 minutes.</p>");

        try {
            restTemplate.postForEntity(RESEND_BASE_URL, new HttpEntity<>(body, headers), Map.class);
        } catch (RestClientResponseException e) {
            throw new RuntimeException(
                    "Resend email send failed (" + e.getStatusCode().value() + "): " + e.getResponseBodyAsString());
        } catch (RestClientException e) {
            throw new RuntimeException("Could not reach Resend: " + e.getMessage());
        }
    }
}
