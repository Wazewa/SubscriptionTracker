package ru.ivt.subscriptiontracker.app.subscription.dto;

import jakarta.validation.constraints.*;
import ru.ivt.subscriptiontracker.app.subscription.entity.Currency;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;

public record SubscriptionRequest(
        @NotBlank(message = "Name is required")
        @Size(max = 100, message = "Name must be at most 100 characters")
        String name,

        @NotNull(message = "Amount is required")
        @Positive(message = "Amount must be positive")
        BigDecimal amount,

        @NotNull(message = "Currency is required")
        Currency currency,

        @NotNull(message = "Next payment date is required")
        @FutureOrPresent(message = "Next payment date must be today or in the future")
        LocalDate nextPaymentDate,

        @NotBlank(message = "Period is required")
        @Size(max = 20, message = "Period must be at most 20 characters")
        String period,

        Integer periodDays,

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
