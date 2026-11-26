package ru.ivt.subscriptiontracker.app.notification.dto;

import ru.ivt.subscriptiontracker.app.notification.entity.NotificationEntity;

import java.time.OffsetDateTime;

public record NotificationResponse(
        Long id,
        Long subscriptionId,
        String message,
        boolean sentToTelegram,
        boolean read,
        String status,
        OffsetDateTime createdAt,
        OffsetDateTime sentAt
) {
    public static NotificationResponse from(NotificationEntity n) {
        return new NotificationResponse(
                n.getId(),
                n.getSubscriptionId(),
                n.getMessage(),
                n.isSentToTelegram(),
                n.isRead(),
                n.getStatus(),
                n.getCreatedAt(),
                n.getSentAt()
        );
    }
}
