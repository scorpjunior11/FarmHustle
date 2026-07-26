package com.farmhustle.farmhustle_backend.service;

import com.farmhustle.farmhustle_backend.entity.User;
import com.farmhustle.farmhustle_backend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<User> getAll() {
        return userRepository.findAllByOrderByCreatedAtDesc();
    }

    public Optional<User> getById(UUID id) {
        return userRepository.findById(id);
    }

    public Optional<User> getByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public Optional<User> getByPhone(String phone) {
        return userRepository.findByPhone(phone);
    }

    public User update(User user) {
        return userRepository.save(user);
    }

    public User updateProfilePhoto(UUID id, String profilePhotoUrl) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));
        user.setProfilePhotoUrl(profilePhotoUrl);
        return userRepository.save(user);
    }

    public void delete(UUID id) {
        userRepository.deleteById(id);
    }
}
