package ru.ivt.subscriptiontracker.app.notification.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record NotificationReadRequest(
        @Schema(description = "Прочитано ли уведомление", example = "true")
        @NotNull(message = "Read status is required")
        Boolean read
) {
}
