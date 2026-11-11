package ru.ivt.subscriptiontracker.app.dashboard.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.ivt.subscriptiontracker.app.dashboard.dto.DashboardCategoryResponse;
import ru.ivt.subscriptiontracker.app.dashboard.dto.DashboardSummaryResponse;
import ru.ivt.subscriptiontracker.app.dashboard.dto.DashboardUpcomingResponse;
import ru.ivt.subscriptiontracker.app.dashboard.mapper.DashboardMapper;
import ru.ivt.subscriptiontracker.app.dashboard.repository.DashboardRepository;
import ru.ivt.subscriptiontracker.app.security.CurrentUserService;
import ru.ivt.subscriptiontracker.app.subscription.entity.Currency;
import ru.ivt.subscriptiontracker.app.subscription.entity.PeriodType;
import ru.ivt.subscriptiontracker.app.subscription.entity.SubscriptionEntity;
import ru.ivt.subscriptiontracker.app.subscription.entity.SubscriptionStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final BigDecimal DAYS_IN_MONTH = BigDecimal.valueOf(30);
    private static final BigDecimal WEEKS_IN_YEAR = BigDecimal.valueOf(52);
    private static final BigDecimal MONTHS_IN_YEAR = BigDecimal.valueOf(12);
    private static final String OTHER_CATEGORY = "Другое";

    private final DashboardRepository dashboardRepository;
    private final CurrentUserService currentUserService;
    private final DashboardMapper dashboardMapper;

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary(YearMonth requestedMonth) {
        YearMonth month = resolveMonth(requestedMonth);
        List<SubscriptionEntity> subscriptions = getActiveSubscriptions();

        Map<Currency, BigDecimal> monthlyTotals = new EnumMap<>(Currency.class);
        Map<Currency, BigDecimal> actualTotals = new EnumMap<>(Currency.class);

        for (SubscriptionEntity subscription : subscriptions) {
            Currency currency = subscription.getCurrency();

            BigDecimal monthlyAmount = calculateMonthlyEquivalent(subscription);
            monthlyTotals.merge(currency, monthlyAmount, BigDecimal::add);

            int chargesCount = countChargesInMonth(subscription, month);
            BigDecimal actualAmount = subscription.getAmount()
                    .multiply(BigDecimal.valueOf(chargesCount));

            actualTotals.merge(currency, actualAmount, BigDecimal::add);
        }

        List<DashboardSummaryResponse.CurrencySummary> currencies =
                monthlyTotals.keySet().stream()
                        .sorted(Comparator.comparing(Enum::name))
                        .map(currency -> new DashboardSummaryResponse.CurrencySummary(
                                currency,
                                monthlyTotals.get(currency).setScale(0, RoundingMode.HALF_UP),
                                actualTotals.getOrDefault(currency, BigDecimal.ZERO)
                                        .setScale(2, RoundingMode.HALF_UP)
                        ))
                        .toList();

        log.info("Dashboard summary requested for user={}, month={}",
                currentUserService.getEmail(), month);

        return new DashboardSummaryResponse(month, currencies);
    }

    @Transactional(readOnly = true)
    public DashboardCategoryResponse getCategoryExpenses(
            YearMonth requestedMonth,
            BigDecimal threshold
    ) {
        YearMonth month = resolveMonth(requestedMonth);
        BigDecimal effectiveThreshold = threshold == null
                ? BigDecimal.valueOf(5)
                : threshold;

        if (effectiveThreshold.compareTo(BigDecimal.ZERO) < 0
                || effectiveThreshold.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new IllegalArgumentException(
                    "Category threshold must be between 0 and 100"
            );
        }

        List<SubscriptionEntity> subscriptions = getActiveSubscriptions();

        Map<Currency, Map<Long, CategoryAccumulator>> grouped = new EnumMap<>(Currency.class);

        for (SubscriptionEntity subscription : subscriptions) {
            int chargesCount = countChargesInMonth(subscription, month);

            if (chargesCount == 0) {
                continue;
            }

            BigDecimal amount = subscription.getAmount()
                    .multiply(BigDecimal.valueOf(chargesCount));

            Currency currency = subscription.getCurrency();
            Long categoryId = subscription.getCategory().getId();
            String categoryName = subscription.getCategory().getName();

            Map<Long, CategoryAccumulator> categories =
                    grouped.computeIfAbsent(currency, key -> new LinkedHashMap<>());

            CategoryAccumulator accumulator = categories.computeIfAbsent(
                    categoryId,
                    key -> new CategoryAccumulator(categoryId, categoryName)
            );

            accumulator.amount = accumulator.amount.add(amount);
        }

        List<DashboardCategoryResponse.CurrencyCategoryBreakdown> result =
                grouped.entrySet().stream()
                        .sorted(Map.Entry.comparingByKey())
                        .map(entry -> buildCategoryBreakdown(
                                entry.getKey(),
                                entry.getValue(),
                                effectiveThreshold
                        ))
                        .toList();

        log.info("Dashboard category expenses requested for user={}, month={}",
                currentUserService.getEmail(), month);

        return new DashboardCategoryResponse(month, result);
    }

    @Transactional(readOnly = true)
    public DashboardUpcomingResponse getUpcomingPayments(Integer limit) {
        if (limit != null && limit < 1) {
            throw new IllegalArgumentException("Limit must be greater than zero");
        }

        LocalDate today = LocalDate.now();

        List<SubscriptionEntity> upcoming = getActiveSubscriptions().stream()
                .filter(subscription ->
                        !subscription.getNextPaymentDate().isBefore(today))
                .sorted(Comparator.comparing(
                        SubscriptionEntity::getNextPaymentDate
                ))
                .toList();

        Map<Currency, BigDecimal> totals = new EnumMap<>(Currency.class);

        for (SubscriptionEntity subscription : upcoming) {
            totals.merge(
                    subscription.getCurrency(),
                    subscription.getAmount(),
                    BigDecimal::add
            );
        }

        List<DashboardUpcomingResponse.UpcomingPayment> payments =
                (limit == null ? upcoming : upcoming.stream().limit(limit).toList())
                        .stream()
                        .map(dashboardMapper::toUpcomingPayment)
                        .toList();

        List<DashboardUpcomingResponse.CurrencyTotal> currencyTotals =
                totals.entrySet().stream()
                        .sorted(Map.Entry.comparingByKey())
                        .map(entry -> new DashboardUpcomingResponse.CurrencyTotal(
                                entry.getKey(),
                                entry.getValue().setScale(2, RoundingMode.HALF_UP)
                        ))
                        .toList();

        log.info("Upcoming payments requested for user={}, count={}",
                currentUserService.getEmail(), upcoming.size());

        return new DashboardUpcomingResponse(
                payments,
                upcoming.size(),
                currencyTotals
        );
    }

    private List<SubscriptionEntity> getActiveSubscriptions() {
        return dashboardRepository
                .findAllByUser_EmailAndStatusOrderByNextPaymentDateAsc(
                        currentUserService.getEmail(),
                        SubscriptionStatus.ACTIVE.name()
                );
    }

    private YearMonth resolveMonth(YearMonth month) {
        return month == null ? YearMonth.now() : month;
    }

    private BigDecimal calculateMonthlyEquivalent(SubscriptionEntity subscription) {
        BigDecimal amount = subscription.getAmount();

        return switch (subscription.getPeriod()) {
            case WEEKLY -> amount.multiply(WEEKS_IN_YEAR)
                    .divide(MONTHS_IN_YEAR, 2, RoundingMode.HALF_UP);

            case MONTHLY -> amount;

            case YEARLY -> amount.divide(
                    MONTHS_IN_YEAR,
                    2,
                    RoundingMode.HALF_UP
            );

            case CUSTOM -> {
                Integer periodDays = subscription.getPeriodDays();

                if (periodDays == null || periodDays <= 0) {
                    log.warn("Invalid custom period for subscription id={}", subscription.getId());
                    yield BigDecimal.ZERO;
                }

                yield amount.multiply(DAYS_IN_MONTH)
                        .divide(
                                BigDecimal.valueOf(periodDays),
                                2,
                                RoundingMode.HALF_UP
                        );
            }
        };
    }

    private int countChargesInMonth(
            SubscriptionEntity subscription,
            YearMonth month
    ) {
        LocalDate anchor = subscription.getNextPaymentDate();
        LocalDate start = month.atDay(1);
        LocalDate end = month.atEndOfMonth();

        OffsetDateTime createdAt = subscription.getCreatedAt();
        if (createdAt != null && createdAt.toLocalDate().isAfter(start)) {
            start = createdAt.toLocalDate();
        }

        if (start.isAfter(end)) {
            return 0;
        }

        if (subscription.getPeriod() == PeriodType.CUSTOM) {
            Integer periodDays = subscription.getPeriodDays();

            if (periodDays == null || periodDays <= 0) {
                log.warn("Invalid custom period for subscription id={}", subscription.getId());
                return 0;
            }
        }

        long daysBetween = ChronoUnit.DAYS.between(anchor, start);

        long index = switch (subscription.getPeriod()) {
            case WEEKLY -> Math.floorDiv(daysBetween, 7);

            case MONTHLY -> ChronoUnit.MONTHS.between(
                    YearMonth.from(anchor),
                    month
            );

            case YEARLY -> ChronoUnit.YEARS.between(anchor, start);

            case CUSTOM -> Math.floorDiv(
                    daysBetween,
                    subscription.getPeriodDays().longValue()
            );
        };

        LocalDate occurrence = occurrenceAt(subscription, index);

        while (occurrence.isBefore(start)) {
            index++;
            occurrence = occurrenceAt(subscription, index);
        }

        while (occurrenceAt(subscription, index - 1).isAfter(start)
                || occurrenceAt(subscription, index - 1).isEqual(start)) {
            index--;
            occurrence = occurrenceAt(subscription, index);
        }

        int count = 0;

        while (!occurrence.isAfter(end)) {
            count++;
            index++;
            occurrence = occurrenceAt(subscription, index);
        }

        return count;
    }

    private LocalDate occurrenceAt(SubscriptionEntity subscription, long index) {
        LocalDate anchor = subscription.getNextPaymentDate();

        return switch (subscription.getPeriod()) {
            case WEEKLY -> anchor.plusWeeks(index);

            case MONTHLY -> anchor.plusMonths(index);

            case YEARLY -> anchor.plusYears(index);

            case CUSTOM -> anchor.plusDays(
                    index * subscription.getPeriodDays()
            );
        };
    }

    private DashboardCategoryResponse.CurrencyCategoryBreakdown buildCategoryBreakdown(
            Currency currency,
            Map<Long, CategoryAccumulator> categories,
            BigDecimal threshold
    ) {
        BigDecimal total = categories.values().stream()
                .map(category -> category.amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<DashboardCategoryResponse.CategoryExpense> result = new ArrayList<>();
        BigDecimal otherAmount = BigDecimal.ZERO;

        for (CategoryAccumulator category : categories.values()) {
            BigDecimal percentage = calculatePercentage(category.amount, total);

            if (percentage.compareTo(threshold) < 0) {
                otherAmount = otherAmount.add(category.amount);
                continue;
            }

            result.add(new DashboardCategoryResponse.CategoryExpense(
                    category.id,
                    category.name,
                    category.amount.setScale(2, RoundingMode.HALF_UP),
                    percentage,
                    false
            ));
        }

        if (otherAmount.compareTo(BigDecimal.ZERO) > 0) {
            result.add(new DashboardCategoryResponse.CategoryExpense(
                    null,
                    OTHER_CATEGORY,
                    otherAmount.setScale(2, RoundingMode.HALF_UP),
                    calculatePercentage(otherAmount, total),
                    true
            ));
        }

        return new DashboardCategoryResponse.CurrencyCategoryBreakdown(
                currency,
                total.setScale(2, RoundingMode.HALF_UP),
                result
        );
    }

    private BigDecimal calculatePercentage(BigDecimal amount, BigDecimal total) {
        if (total.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }

        return amount.multiply(BigDecimal.valueOf(100))
                .divide(total, 2, RoundingMode.HALF_UP);
    }

    private static class CategoryAccumulator {
        private final Long id;
        private final String name;
        private BigDecimal amount = BigDecimal.ZERO;

        private CategoryAccumulator(Long id, String name) {
            this.id = id;
            this.name = name;
        }
    }
}
