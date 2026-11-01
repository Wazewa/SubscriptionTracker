package ru.ivt.subscriptiontracker.app.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import ru.ivt.subscriptiontracker.app.subscription.entity.Currency;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

@Schema(description = "Сводная информация о расходах пользователя")
public record DashboardSummaryResponse(

        @Schema(description = "Выбранный месяц")
        YearMonth month,

        @Schema(description = "Суммы расходов в разрезе валют")
        List<CurrencySummary> currencies

) {
    public record CurrencySummary(

            Currency currency,

            @Schema(description = "Месячный эквивалент активных подписок")
            BigDecimal monthlyEquivalent,

            @Schema(description = "Фактические списания за выбранный месяц")
            BigDecimal actualCharges

    ) {}
}