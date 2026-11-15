package ru.ivt.subscriptiontracker.app.notification.dto;

import jakarta.validation.constraints.Size;

public record NotificationSettingsRequest(
        @Size(max = 64) String telegramChatId
) {}