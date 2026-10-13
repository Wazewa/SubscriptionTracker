package ru.ivt.subscriptiontracker.app.auth.exception;

public class InvalidPasswordChangeException extends RuntimeException {

    public InvalidPasswordChangeException(String message) {
        super(message);
    }
}