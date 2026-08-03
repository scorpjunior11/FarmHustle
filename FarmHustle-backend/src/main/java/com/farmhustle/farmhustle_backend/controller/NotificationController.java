package com.farmhustle.farmhustle_backend.controller;

import com.farmhustle.farmhustle_backend.entity.User;
import com.farmhustle.farmhustle_backend.security.CurrentUser;
import com.farmhustle.farmhustle_backend.service.PushNotificationService;
import com.farmhustle.farmhustle_backend.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final PushNotificationService pushNotificationService;
    private final UserService userService;

    public NotificationController(PushNotificationService pushNotificationService,
                                   UserService userService) {
        this.pushNotificationService = pushNotificationService;
        this.userService = userService;
    }

    // STAGE-2 TESTING ONLY: Remove after testing push notification delivery.
    // This endpoint proves that the notification send pipeline works end-to-end.
    @PostMapping("/test")
    public ResponseEntity<String> sendTestNotification() {
        UUID userId = CurrentUser.id();
        User user = userService.getById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        pushNotificationService.sendToUser(user, "FarmHustle", "Push notifications are working!");

        return ResponseEntity.ok("Test notification sent to " + user.getEmail());
    }
}
