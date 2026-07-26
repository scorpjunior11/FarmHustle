package com.farmhustle.farmhustle_backend.repository;

import com.farmhustle.farmhustle_backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    List<User> findAllByOrderByCreatedAtDesc();

    Optional<User> findByEmail(String email);

    Optional<User> findByPhone(String phone);
}
