package com.farmhustle.farmhustle_backend.controller;

import com.farmhustle.farmhustle_backend.entity.User;
import com.farmhustle.farmhustle_backend.security.CurrentUser;
import com.farmhustle.farmhustle_backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<User>> getAll() {
        return ResponseEntity.ok(userService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getById(@PathVariable UUID id) {
        return userService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<User> create(@Valid @RequestBody User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @Valid @RequestBody User user) {
        if (!CurrentUser.id().equals(id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only update your own profile.");
        }
        return userService.getById(id)
                .map(existing -> {
                    // Only name/phone/city are user-editable through this endpoint.
                    // role, isActive, emailVerified, passwordHash, verificationCode,
                    // verificationCodeExpiry and profilePhotoUrl (its own dedicated
                    // /photo endpoint) are never taken from the request body.
                    existing.setName(user.getName());
                    existing.setPhone(user.getPhone());
                    existing.setCity(user.getCity());
                    return ResponseEntity.ok(userService.update(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        if (userService.getById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/photo")
    public ResponseEntity<?> updateProfilePhoto(@PathVariable UUID id, @RequestBody ProfilePhotoRequest body) {
        try {
            return ResponseEntity.ok(userService.updateProfilePhoto(id, body.profilePhotoUrl()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private record ProfilePhotoRequest(String profilePhotoUrl) {}
}
