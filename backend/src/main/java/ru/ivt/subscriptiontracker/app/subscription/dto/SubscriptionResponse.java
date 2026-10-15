package ru.ivt.subscriptiontracker.app.subscription.dto;

import ru.ivt.subscriptiontracker.app.subscription.entity.Currency;
import ru.ivt.subscriptiontracker.app.subscription.entity.SubscriptionStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record SubscriptionResponse (
        Long id,
        String name,
        BigDecimal amount,
        Currency currency,
        LocalDate nextPaymentDate,
        String period,
        Integer periodDays,
        SubscriptionStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        Long categoryId
) {
}
