package com.farmhustle.farmhustle_backend.controller;

import com.farmhustle.farmhustle_backend.entity.Role;
import com.farmhustle.farmhustle_backend.entity.User;
import com.farmhustle.farmhustle_backend.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest body) {
        try {
            User user = authService.signup(body.name(), body.email(), body.phone(), body.password(), body.role(), body.region());
            return ResponseEntity.status(HttpStatus.CREATED).body(user);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest body) {
        try {
            return ResponseEntity.ok(authService.login(body.email(), body.password()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private record SignupRequest(String name, String email, String phone, String password, Role role, String region) {}
    private record LoginRequest(String email, String password) {}
}
