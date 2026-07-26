package com.farmhustle.farmhustle_backend.service;

import com.farmhustle.farmhustle_backend.entity.PendingSignup;
import com.farmhustle.farmhustle_backend.entity.Role;
import com.farmhustle.farmhustle_backend.entity.User;
import com.farmhustle.farmhustle_backend.exception.EmailNotVerifiedException;
import com.farmhustle.farmhustle_backend.repository.PendingSignupRepository;
import com.farmhustle.farmhustle_backend.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
public class AuthService {

    private static final long VERIFICATION_CODE_VALIDITY_MINUTES = 15;
    private static final long RESEND_COOLDOWN_SECONDS = 60;

    private final UserRepository userRepository;
    private final PendingSignupRepository pendingSignupRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(UserRepository userRepository, PendingSignupRepository pendingSignupRepository,
                        BCryptPasswordEncoder passwordEncoder, EmailService emailService) {
        this.userRepository = userRepository;
        this.pendingSignupRepository = pendingSignupRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    @Transactional
    public PendingSignup signup(String name, String email, String phone, String rawPassword, Role role, String city) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("An account with this email already exists.");
        }
        if (userRepository.findByPhone(phone).isPresent()) {
            throw new RuntimeException("An account with this phone number already exists.");
        }

        // An abandoned signup for this email or phone is overwritten, not rejected —
        // it isn't a real account, so there's nothing to protect by blocking a retry.
        PendingSignup pending = pendingSignupRepository.findByEmail(email)
                .or(() -> pendingSignupRepository.findByPhone(phone))
                .orElseGet(PendingSignup::new);

        pending.setName(name);
        pending.setEmail(email);
        pending.setPhone(phone);
        pending.setPasswordHash(passwordEncoder.encode(rawPassword));
        pending.setRole(role);
        pending.setCity(city);
        assignNewVerificationCode(pending);
        pending = pendingSignupRepository.save(pending);
        emailService.sendVerificationCode(pending.getEmail(), pending.getVerificationCode());
        return pending;
    }

    public User login(String email, String rawPassword) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null) {
            if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
                throw new RuntimeException("Invalid email or password");
            }
            return user;
        }

        // No verified account — but if there's a pending signup and the password
        // matches it, tell the caller they need to verify rather than "wrong password".
        // A non-matching password gives the same generic error as "no account at all",
        // so a failed guess never reveals whether a pending signup exists.
        PendingSignup pending = pendingSignupRepository.findByEmail(email).orElse(null);
        if (pending != null && passwordEncoder.matches(rawPassword, pending.getPasswordHash())) {
            throw new EmailNotVerifiedException(email);
        }

        throw new RuntimeException("Invalid email or password");
    }

    @Transactional
    public User verifyEmail(String email, String code) {
        PendingSignup pending = pendingSignupRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Invalid or expired code"));
        if (pending.getVerificationCode() == null
                || !pending.getVerificationCode().equals(code)
                || pending.getVerificationCodeExpiry() == null
                || pending.getVerificationCodeExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Invalid or expired code");
        }

        User user = new User();
        user.setName(pending.getName());
        user.setEmail(pending.getEmail());
        user.setPhone(pending.getPhone());
        user.setPasswordHash(pending.getPasswordHash());
        user.setRole(pending.getRole());
        user.setCity(pending.getCity());
        user.setIsActive(true);
        user = userRepository.save(user);
        pendingSignupRepository.delete(pending);
        return user;
    }

    public void resendVerificationCode(String email) {
        PendingSignup pending = pendingSignupRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("No account found with this email."));
        if (pending.getLastCodeSentAt() != null
                && pending.getLastCodeSentAt().plusSeconds(RESEND_COOLDOWN_SECONDS).isAfter(LocalDateTime.now())) {
            throw new RuntimeException("Please wait a moment before requesting another code.");
        }
        assignNewVerificationCode(pending);
        pendingSignupRepository.save(pending);
        emailService.sendVerificationCode(pending.getEmail(), pending.getVerificationCode());
    }

    private void assignNewVerificationCode(PendingSignup pending) {
        String code = String.format("%06d", secureRandom.nextInt(1_000_000));
        LocalDateTime now = LocalDateTime.now();
        pending.setVerificationCode(code);
        pending.setVerificationCodeExpiry(now.plusMinutes(VERIFICATION_CODE_VALIDITY_MINUTES));
        pending.setLastCodeSentAt(now);
    }
}
