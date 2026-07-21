package com.farmhustle.farmhustle_backend.controller;

import com.farmhustle.farmhustle_backend.entity.PendingSignup;
import com.farmhustle.farmhustle_backend.entity.Role;
import com.farmhustle.farmhustle_backend.entity.User;
import com.farmhustle.farmhustle_backend.exception.EmailDeliveryException;
import com.farmhustle.farmhustle_backend.exception.EmailNotVerifiedException;
import com.farmhustle.farmhustle_backend.service.AuthService;
import com.farmhustle.farmhustle_backend.service.JwtService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    public AuthController(AuthService authService, JwtService jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest body) {
        try {
            PendingSignup pending = authService.signup(body.name(), body.email(), body.phone(), body.password(), body.role(), body.city());
            return ResponseEntity.status(HttpStatus.CREATED).body(new SignupResponse("Verification code sent", pending.getEmail()));
        } catch (EmailDeliveryException e) {
            throw e;
        } catch (DataIntegrityViolationException e) {
            throw e;
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest body) {
        try {
            User user = authService.login(body.email(), body.password());
            String token = jwtService.generateToken(user);
            return ResponseEntity.ok(new AuthResponse(token, user));
        } catch (EmailNotVerifiedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new EmailNotVerifiedResponse("EMAIL_NOT_VERIFIED", e.getMessage(), e.getEmail()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestBody VerifyEmailRequest body) {
        try {
            User user = authService.verifyEmail(body.email(), body.code());
            String token = jwtService.generateToken(user);
            return ResponseEntity.ok(new AuthResponse(token, user));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body("Invalid or expired code");
        }
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestBody ResendVerificationRequest body) {
        try {
            authService.resendVerificationCode(body.email());
            return ResponseEntity.ok(new SignupResponse("Verification code sent", body.email()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private record SignupRequest(
            @NotBlank String name,
            @NotBlank @Email String email,
            @NotBlank @Pattern(regexp = "^0\\d{9}$", message = "phone must be a valid Ghana number, e.g. 0241234567") String phone,
            @NotBlank @Size(min = 8, message = "password must be at least 8 characters") String password,
            @NotNull Role role,
            @NotBlank String city) {}
    private record LoginRequest(String email, String password) {}
    private record VerifyEmailRequest(String email, String code) {}
    private record ResendVerificationRequest(String email) {}
    private record AuthResponse(String token, User user) {}
    private record SignupResponse(String message, String email) {}
    private record EmailNotVerifiedResponse(String error, String message, String email) {}
}
