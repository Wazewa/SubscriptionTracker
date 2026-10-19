package ru.ivt.subscriptiontracker.app.subscription.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import ru.ivt.subscriptiontracker.app.subscription.entity.Currency;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;

@Schema(description = "Запрос на создание или обновление подписки")
public record SubscriptionRequest(

        @Schema(description = "Название подписки", example = "Netflix", maxLength = 100, requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank(message = "Name is required")
        @Size(max = 100, message = "Name must be at most 100 characters")
        String name,

        @Schema(description = "Стоимость подписки (должна быть больше 0)", example = "15.99", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull(message = "Amount is required")
        @Positive(message = "Amount must be positive")
        BigDecimal amount,

        @Schema(description = "Валюта подписки", example = "USD", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull(message = "Currency is required")
        Currency currency,

        @Schema(description = "Дата следующего платежа (сегодня или в будущем)", example = "2026-11-01", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull(message = "Next payment date is required")
        @FutureOrPresent(message = "Next payment date must be today or in the future")
        LocalDate nextPaymentDate,

        @Schema(description = "Периодичность (например, MONTHLY, YEARLY, CUSTOM)", example = "MONTHLY", maxLength = 20, requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank(message = "Period is required")
        @Size(max = 20, message = "Period must be at most 20 characters")
        String period,

        @Schema(description = "Количество дней (обязательно только для period=CUSTOM, иначе null)", example = "30", nullable = true)
        Integer periodDays,

        @Schema(description = "ID категории подписки", example = "1", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotNull(message = "Category ID is required")
        @Min(value = 1, message = "Category ID must be at least 1")
        Long categoryId

) {
        @AssertTrue(message = "Period days is required for CUSTOM period and must be null otherwise")
        public boolean isPeriodDaysValid() {
                if (Objects.equals(period, "CUSTOM")) {
                        return periodDays != null && periodDays > 0;
                }
                return periodDays == null;
        }
}