package ru.ivt.subscriptiontracker.app.exception;

import java.time.Instant;

public record ApiError(
        Instant timestamp,
        int status,
        String message
) {
}