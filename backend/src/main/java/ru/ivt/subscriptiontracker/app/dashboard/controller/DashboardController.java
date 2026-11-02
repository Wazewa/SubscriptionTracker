
package ru.ivt.subscriptiontracker.app.dashboard.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ru.ivt.subscriptiontracker.app.dashboard.dto.DashboardCategoryResponse;
import ru.ivt.subscriptiontracker.app.dashboard.dto.DashboardSummaryResponse;
import ru.ivt.subscriptiontracker.app.dashboard.dto.DashboardUpcomingResponse;
import ru.ivt.subscriptiontracker.app.dashboard.service.DashboardService;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;

@RestController
@RequiredArgsConstructor
@Validated
@RequestMapping("/api/dashboard")
@Tag(
        name = "Dashboard",
        description = "Получение агрегированной информации для дашборда"
)
@SecurityRequirement(name = "bearerAuth")
public class DashboardController {

    private final DashboardService dashboardService;

    @Operation(
            summary = "Получить сводку расходов",
            description = "Возвращает месячный эквивалент активных подписок " +
                    "и сумму календарных списаний за выбранный месяц"
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Сводка успешно получена"),
            @ApiResponse(responseCode = "400", description = "Некорректный месяц"),
            @ApiResponse(responseCode = "401", description = "Требуется авторизация")
    })
    @GetMapping("/summary")
    public DashboardSummaryResponse getSummary(
            @Parameter(
                    description = "Месяц в формате YYYY-MM. По умолчанию текущий месяц",
                    example = "2026-11"
            )
            @RequestParam(required = false) String month
    ) {
        return dashboardService.getSummary(parseMonth(month));
    }

    @Operation(
            summary = "Получить расходы по категориям",
            description = "Возвращает суммы расходов и процентные доли категорий " +
                    "за выбранный месяц. Малые категории объединяются в Другое"
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Расходы по категориям получены"),
            @ApiResponse(responseCode = "400", description = "Некорректные параметры"),
            @ApiResponse(responseCode = "401", description = "Требуется авторизация")
    })
    @GetMapping("/categories")
    public DashboardCategoryResponse getCategoryExpenses(
            @Parameter(
                    description = "Месяц в формате YYYY-MM",
                    example = "2026-11"
            )
            @RequestParam(required = false) String month,

            @Parameter(
                    description = "Порог объединения категорий в процентах",
                    example = "5"
            )
            @RequestParam(defaultValue = "5")
            @DecimalMin("0.0")
            @DecimalMax("100.0")
            BigDecimal threshold
    ) {
        return dashboardService.getCategoryExpenses(parseMonth(month), threshold);
    }

    @Operation(
            summary = "Получить ближайшие списания",
            description = "Возвращает предстоящие списания по активным подпискам. " +
                    "Если limit не указан, возвращается полный список"
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Список списаний получен"),
            @ApiResponse(responseCode = "400", description = "Некорректный лимит"),
            @ApiResponse(responseCode = "401", description = "Требуется авторизация")
    })
    @GetMapping("/upcoming")
    public DashboardUpcomingResponse getUpcomingPayments(
            @Parameter(
                    description = "Максимальное количество записей. " +
                            "Не указывать для получения полного списка",
                    example = "4"
            )
            @RequestParam(required = false)
            @Min(1)
            Integer limit
    ) {
        return dashboardService.getUpcomingPayments(limit);
    }

    private YearMonth parseMonth(String month) {
        if (month == null) {
            return null;
        }

        if (!month.matches("\\d{4}-(0[1-9]|1[0-2])")) {
            throw new DateTimeParseException(
                    "Invalid month format. Expected YYYY-MM",
                    month,
                    0
            );
        }

        return YearMonth.parse(month);
    }
}
