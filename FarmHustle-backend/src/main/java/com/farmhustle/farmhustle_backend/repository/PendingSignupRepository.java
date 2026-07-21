package com.farmhustle.farmhustle_backend.repository;

import com.farmhustle.farmhustle_backend.entity.PendingSignup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PendingSignupRepository extends JpaRepository<PendingSignup, UUID> {

    Optional<PendingSignup> findByEmail(String email);

    Optional<PendingSignup> findByPhone(String phone);
}
