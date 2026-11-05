package ru.ivt.subscriptiontracker.app.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import ru.ivt.subscriptiontracker.app.subscription.entity.Currency;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

@Schema(description = "Расходы пользователя по категориям")
public record DashboardCategoryResponse(

        YearMonth month,

        List<CurrencyCategoryBreakdown> currencies

) {
    public record CurrencyCategoryBreakdown(

            Currency currency,

            BigDecimal totalAmount,

            List<CategoryExpense> categories

    ) {}

    public record CategoryExpense(

            Long categoryId,

            String categoryName,

            BigDecimal amount,

            @Schema(description = "Доля категории в процентах")
            BigDecimal percentage,

            @Schema(description = "Признак объединения категории в Другое")
            boolean other

    ) {}
}