package com.farmhustle.farmhustle_backend.service;

import com.farmhustle.farmhustle_backend.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class PushNotificationService {

    private static final Logger log = LoggerFactory.getLogger(PushNotificationService.class);
    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    private final RestTemplate restTemplate = new RestTemplate();

    public void sendToUser(User user, String title, String body) {
        if (user == null || user.getExpoPushToken() == null || user.getExpoPushToken().isBlank()) {
            log.debug("User {} has no expo push token; skipping notification", user != null ? user.getId() : "null");
            return;
        }

        try {
            sendNotification(user.getExpoPushToken(), title, body);
        } catch (Exception e) {
            log.error("Failed to send push notification to user {}: {}", user.getId(), e.getMessage(), e);
        }
    }

    private void sendNotification(String expoPushToken, String title, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        Map<String, Object> requestBody = Map.of(
                "to", expoPushToken,
                "title", title,
                "body", body,
                "sound", "default"
        );

        try {
            restTemplate.postForEntity(EXPO_PUSH_URL, new HttpEntity<>(requestBody, headers), Map.class);
            log.debug("Push notification sent to token: {}", expoPushToken);
        } catch (RestClientException e) {
            throw new RuntimeException("Failed to send push notification: " + e.getMessage(), e);
        }
    }
}
