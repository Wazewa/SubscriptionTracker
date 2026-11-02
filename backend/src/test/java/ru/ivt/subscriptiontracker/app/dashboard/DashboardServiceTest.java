
package ru.ivt.subscriptiontracker.app.dashboard.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.ivt.subscriptiontracker.app.dashboard.dto.DashboardCategoryResponse;
import ru.ivt.subscriptiontracker.app.dashboard.dto.DashboardSummaryResponse;
import ru.ivt.subscriptiontracker.app.dashboard.dto.DashboardUpcomingResponse;
import ru.ivt.subscriptiontracker.app.dashboard.mapper.DashboardMapper;
import ru.ivt.subscriptiontracker.app.dashboard.repository.DashboardRepository;
import ru.ivt.subscriptiontracker.app.security.CurrentUserService;
import ru.ivt.subscriptiontracker.app.subscription.entity.Currency;
import ru.ivt.subscriptiontracker.app.subscription.entity.PeriodType;
import ru.ivt.subscriptiontracker.app.subscription.entity.SubscriptionEntity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("DashboardService tests")
class DashboardServiceTest {

    @Mock
    private DashboardRepository dashboardRepository;

    @Mock
    private CurrentUserService currentUserService;

    @Mock
    private DashboardMapper dashboardMapper;

    @InjectMocks
    private DashboardService dashboardService;

    private static final String EMAIL = "test@example.com";

    @Test
    @DisplayName("Calculates monthly equivalent and actual charges")
    void calculatesSummary() {
        when(currentUserService.getEmail()).thenReturn(EMAIL);

        YearMonth month = YearMonth.of(2030, 1);

        SubscriptionEntity subscription = createSubscription(
                1L,
                "Netflix",
                "Развлечения",
                new BigDecimal("100.00"),
                Currency.RUB,
                PeriodType.WEEKLY,
                LocalDate.of(2030, 1, 7)
        );

        when(dashboardRepository
                .findAllByUser_EmailAndStatusOrderByNextPaymentDateAsc(
                        EMAIL, "ACTIVE"
                )).thenReturn(List.of(subscription));

        DashboardSummaryResponse result =
                dashboardService.getSummary(month);

        assertThat(result.month()).isEqualTo(month);
        assertThat(result.currencies()).hasSize(1);

        DashboardSummaryResponse.CurrencySummary summary =
                result.currencies().getFirst();

        assertThat(summary.currency()).isEqualTo(Currency.RUB);
        assertThat(summary.monthlyEquivalent())
                .isEqualByComparingTo("433");
        assertThat(summary.actualCharges())
                .isEqualByComparingTo("400.00");
    }

    @Test
    @DisplayName("Returns zero values when user has no subscriptions")
    void returnsEmptySummary() {
        when(currentUserService.getEmail()).thenReturn(EMAIL);

        when(dashboardRepository
                .findAllByUser_EmailAndStatusOrderByNextPaymentDateAsc(
                        EMAIL, "ACTIVE"
                )).thenReturn(List.of());

        DashboardSummaryResponse result =
                dashboardService.getSummary(YearMonth.of(2030, 1));

        assertThat(result.currencies()).isEmpty();
    }

    @Test
    @DisplayName("Groups small categories into Other")
    void groupsSmallCategories() {
        when(currentUserService.getEmail()).thenReturn(EMAIL);

        YearMonth month = YearMonth.of(2030, 1);

        SubscriptionEntity largeCategory = createSubscription(
                1L,
                "Netflix",
                "Развлечения",
                new BigDecimal("900.00"),
                Currency.RUB,
                PeriodType.MONTHLY,
                LocalDate.of(2030, 1, 10)
        );

        SubscriptionEntity smallCategory = createSubscription(
                2L,
                "Music",
                "Музыка",
                new BigDecimal("40.00"),
                Currency.RUB,
                PeriodType.MONTHLY,
                LocalDate.of(2030, 1, 15)
        );

        when(dashboardRepository
                .findAllByUser_EmailAndStatusOrderByNextPaymentDateAsc(
                        EMAIL, "ACTIVE"
                )).thenReturn(List.of(largeCategory, smallCategory));

        DashboardCategoryResponse result =
                dashboardService.getCategoryExpenses(
                        month,
                        new BigDecimal("5")
                );

        assertThat(result.currencies()).hasSize(1);

        List<DashboardCategoryResponse.CategoryExpense> categories =
                result.currencies().getFirst().categories();

        assertThat(categories).hasSize(2);

        DashboardCategoryResponse.CategoryExpense other =
                categories.stream()
                        .filter(DashboardCategoryResponse.CategoryExpense::other)
                        .findFirst()
                        .orElseThrow();

        assertThat(other.categoryName()).isEqualTo("Другое");
        assertThat(other.amount()).isEqualByComparingTo("40.00");
        assertThat(other.percentage()).isEqualByComparingTo("4.26");
    }

    @Test
    @DisplayName("Rejects invalid category threshold")
    void rejectsInvalidThreshold() {
        assertThatThrownBy(() ->
                dashboardService.getCategoryExpenses(
                        YearMonth.of(2030, 1),
                        new BigDecimal("101")
                )
        ).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Returns only four upcoming payments but calculates total for all")
    void limitsUpcomingPayments() {
        when(currentUserService.getEmail()).thenReturn(EMAIL);

        LocalDate today = LocalDate.now();

        List<SubscriptionEntity> subscriptions = List.of(
                createSubscription(1L, "A", "Music", new BigDecimal("100"),
                        Currency.RUB, PeriodType.MONTHLY, today.plusDays(1)),
                createSubscription(2L, "B", "Music", new BigDecimal("200"),
                        Currency.RUB, PeriodType.MONTHLY, today.plusDays(2)),
                createSubscription(3L, "C", "Music", new BigDecimal("300"),
                        Currency.RUB, PeriodType.MONTHLY, today.plusDays(3)),
                createSubscription(4L, "D", "Music", new BigDecimal("400"),
                        Currency.RUB, PeriodType.MONTHLY, today.plusDays(4)),
                createSubscription(5L, "E", "Music", new BigDecimal("500"),
                        Currency.RUB, PeriodType.MONTHLY, today.plusDays(5))
        );

        when(dashboardRepository
                .findAllByUser_EmailAndStatusOrderByNextPaymentDateAsc(
                        EMAIL, "ACTIVE"
                )).thenReturn(subscriptions);

        for (SubscriptionEntity subscription : subscriptions.subList(0, 4)) {
            when(dashboardMapper.toUpcomingPayment(subscription))
                    .thenReturn(new DashboardUpcomingResponse.UpcomingPayment(
                            subscription.getId(),
                            subscription.getName(),
                            subscription.getCategory().getName(),
                            subscription.getAmount(),
                            subscription.getCurrency(),
                            subscription.getNextPaymentDate()
                    ));
        }

        DashboardUpcomingResponse result =
                dashboardService.getUpcomingPayments(4);

        assertThat(result.payments()).hasSize(4);
        assertThat(result.totalCount()).isEqualTo(5);
        assertThat(result.totals()).hasSize(1);
        assertThat(result.totals().getFirst().amount())
                .isEqualByComparingTo("1500.00");
    }

    @Test
    @DisplayName("Returns all upcoming payments when limit is absent")
    void returnsAllUpcomingPayments() {
        when(currentUserService.getEmail()).thenReturn(EMAIL);

        LocalDate today = LocalDate.now();

        SubscriptionEntity subscription = createSubscription(
                1L,
                "Netflix",
                "Развлечения",
                new BigDecimal("599.00"),
                Currency.RUB,
                PeriodType.MONTHLY,
                today.plusDays(2)
        );

        when(dashboardRepository
                .findAllByUser_EmailAndStatusOrderByNextPaymentDateAsc(
                        EMAIL, "ACTIVE"
                )).thenReturn(List.of(subscription));

        when(dashboardMapper.toUpcomingPayment(subscription))
                .thenReturn(new DashboardUpcomingResponse.UpcomingPayment(
                        1L,
                        "Netflix",
                        "Развлечения",
                        new BigDecimal("599.00"),
                        Currency.RUB,
                        today.plusDays(2)
                ));

        DashboardUpcomingResponse result =
                dashboardService.getUpcomingPayments(null);

        assertThat(result.payments()).hasSize(1);
        assertThat(result.totalCount()).isEqualTo(1);
        assertThat(result.totals().getFirst().amount())
                .isEqualByComparingTo("599.00");
    }

    private SubscriptionEntity createSubscription(
            Long id,
            String name,
            String categoryName,
            BigDecimal amount,
            Currency currency,
            PeriodType period,
            LocalDate nextPaymentDate
    ) {
        SubscriptionEntity subscription = new SubscriptionEntity();
        subscription.setId(id);
        subscription.setName(name);
        subscription.setAmount(amount);
        subscription.setCurrency(currency);
        subscription.setPeriod(period);
        subscription.setNextPaymentDate(nextPaymentDate);
        subscription.setPeriodDays(null);
        subscription.setStatus("ACTIVE");

        ru.ivt.subscriptiontracker.app.category.entity.CategoryEntity category =
                new ru.ivt.subscriptiontracker.app.category.entity.CategoryEntity();

        category.setId(id);
        category.setName(categoryName);

        subscription.setCategory(category);

        return subscription;
    }
}
