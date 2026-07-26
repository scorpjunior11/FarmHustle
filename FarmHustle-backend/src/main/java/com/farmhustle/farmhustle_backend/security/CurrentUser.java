package com.farmhustle.farmhustle_backend.security;

import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

// JwtAuthenticationFilter sets the JWT subject (the caller's user id, as a
// String) as the Authentication principal name — this reads it back as a UUID.
public final class CurrentUser {

    private CurrentUser() {
    }

    public static UUID id() {
        return UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
    }
}
