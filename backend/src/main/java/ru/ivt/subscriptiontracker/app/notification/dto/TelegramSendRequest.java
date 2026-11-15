package ru.ivt.subscriptiontracker.app.notification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TelegramSendRequest(
        @NotBlank(message = "Message is required")
        @Size(max = 4096, message = "Message is too long")
        String message
) {}