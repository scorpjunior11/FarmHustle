package com.farmhustle.farmhustle_backend.exception;

public class EmailNotVerifiedException extends RuntimeException {

    private final String email;

    public EmailNotVerifiedException(String email) {
        super("Please verify your email before logging in. Check your inbox for the code.");
        this.email = email;
    }

    public String getEmail() {
        return email;
    }
}
