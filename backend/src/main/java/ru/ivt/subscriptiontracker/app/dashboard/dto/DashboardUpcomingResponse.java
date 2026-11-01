package ru.ivt.subscriptiontracker.app.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import ru.ivt.subscriptiontracker.app.subscription.entity.Currency;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Schema(description = "Предстоящие списания по подпискам")
public record DashboardUpcomingResponse(

        @Schema(description = "Список ближайших списаний")
        List<UpcomingPayment> payments,

        @Schema(description = "Количество всех предстоящих списаний")
        int totalCount,

        @Schema(description = "Общая сумма всех предстоящих списаний")
        List<CurrencyTotal> totals

) {
    public record UpcomingPayment(

            Long subscriptionId,

            String subscriptionName,

            String categoryName,

            BigDecimal amount,

            Currency currency,

            LocalDate paymentDate

    ) {}

    public record CurrencyTotal(

            Currency currency,

            BigDecimal amount

    ) {}
}