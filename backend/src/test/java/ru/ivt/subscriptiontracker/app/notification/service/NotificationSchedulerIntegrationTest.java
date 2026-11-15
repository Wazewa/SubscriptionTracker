package ru.ivt.subscriptiontracker.app.notification.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import ru.ivt.subscriptiontracker.app.category.entity.CategoryEntity;
import ru.ivt.subscriptiontracker.app.category.repository.CategoryRepository;
import ru.ivt.subscriptiontracker.app.login.BaseApiTest;
import ru.ivt.subscriptiontracker.app.notification.repository.NotificationRepository;
import ru.ivt.subscriptiontracker.app.subscription.entity.Currency;
import ru.ivt.subscriptiontracker.app.subscription.entity.PeriodType;
import ru.ivt.subscriptiontracker.app.subscription.entity.SubscriptionEntity;
import ru.ivt.subscriptiontracker.app.subscription.repository.SubscriptionRepository;
import ru.ivt.subscriptiontracker.app.user.entity.User;
import ru.ivt.subscriptiontracker.app.user.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("Интеграционный тест планировщика уведомлений")
class NotificationSchedulerIntegrationTest extends BaseApiTest {

    @Autowired NotificationScheduler scheduler;
    @Autowired SubscriptionRepository subscriptionRepository;
    @Autowired NotificationRepository notificationRepository;
    @Autowired UserRepository userRepository;
    @Autowired CategoryRepository categoryRepository;

    private User testUser;
    private CategoryEntity testCategory;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        subscriptionRepository.deleteAll();
        userRepository.deleteAll();

        testUser = new User();
        testUser.setEmail("scheduler-test@example.com");
        testUser.setPasswordHash("hash");
        testUser.setBaseCurrency("RUB");
        testUser.setStatus("ACTIVE");
        testUser.setTelegramChatId("123456789");
        testUser = userRepository.save(testUser);

        testCategory = categoryRepository.findAll().get(0);
    }

    @Test
    @DisplayName("Создает уведомление для подписки со скорым списанием")
    void createsNotificationForUpcomingPayment() {
        SubscriptionEntity sub = new SubscriptionEntity();
        sub.setUser(testUser);
        sub.setCategory(testCategory);
        sub.setName("Netflix");
        sub.setAmount(BigDecimal.TEN);
        sub.setCurrency(Currency.RUB);
        sub.setNextPaymentDate(LocalDate.now().plusDays(1));
        sub.setPeriod(PeriodType.MONTHLY);
        sub.setStatus("ACTIVE");
        subscriptionRepository.save(sub);

        scheduler.createUpcomingNotifications();

        var notifications = notificationRepository.findAll();
        assertEquals(1, notifications.size());
        assertEquals(testUser.getUserId(), notifications.get(0).getUserId());
        assertEquals("FAILED", notifications.get(0).getStatus());
    }

    @Test
    @DisplayName("Не создает дубликат уведомления в тот же день")
    void skipsDuplicateNotification() {
        SubscriptionEntity sub = new SubscriptionEntity();
        sub.setUser(testUser);
        sub.setCategory(testCategory);
        sub.setName("Netflix");
        sub.setAmount(BigDecimal.TEN);
        sub.setCurrency(Currency.RUB);
        sub.setNextPaymentDate(LocalDate.now().plusDays(1));
        sub.setPeriod(PeriodType.MONTHLY);
        sub.setStatus("ACTIVE");
        subscriptionRepository.save(sub);

        scheduler.createUpcomingNotifications();
        scheduler.createUpcomingNotifications();

        assertEquals(1, notificationRepository.count());
    }
}