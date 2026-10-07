package ru.ivt.subscriptiontracker.app.dto.response;

import java.time.Instant;

public record ApiError(
        Instant timestamp,
        int status,
        String message
) {
}