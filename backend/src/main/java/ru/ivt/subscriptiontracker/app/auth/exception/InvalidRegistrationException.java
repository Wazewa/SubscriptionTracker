package ru.ivt.subscriptiontracker.app.auth.exception;

public class InvalidRegistrationException extends RuntimeException {

    public InvalidRegistrationException(String message) {
        super(message);
    }
}