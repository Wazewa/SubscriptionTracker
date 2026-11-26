package ru.ivt.subscriptiontracker.app.notification;

import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import ru.ivt.subscriptiontracker.app.category.repository.CategoryRepository;
import ru.ivt.subscriptiontracker.app.login.BaseApiTest;
import ru.ivt.subscriptiontracker.app.notification.entity.NotificationEntity;
import ru.ivt.subscriptiontracker.app.notification.entity.NotificationType;
import ru.ivt.subscriptiontracker.app.notification.repository.NotificationRepository;
import ru.ivt.subscriptiontracker.app.subscription.entity.Currency;
import ru.ivt.subscriptiontracker.app.subscription.entity.PeriodType;
import ru.ivt.subscriptiontracker.app.subscription.entity.SubscriptionEntity;
import ru.ivt.subscriptiontracker.app.subscription.repository.SubscriptionRepository;
import ru.ivt.subscriptiontracker.app.user.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.equalTo;

@DisplayName("Интеграционные тесты уведомлений (/api/notifications)")
class NotificationIntegrationTest extends BaseApiTest {

    private String token;
    private String email;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @BeforeEach
    void registerAndLogin() {
        email = "notif_" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
        String password = "Password123!";

        given().contentType(ContentType.JSON)
                .body(Map.of(
                        "email", email,
                        "password", password,
                        "confirmPassword", password,
                        "personalDataConsent", true))
                .when().post("/api/auth/register")
                .then().statusCode(201);

        token = given().contentType(ContentType.JSON)
                .body(Map.of("email", email, "password", password))
                .when().post("/api/auth/login")
                .then().statusCode(200)
                .extract().path("token");
    }

    @Test
    @DisplayName("GET /api/notifications без токена -> 401")
    void listWithoutToken() {
        given().when().get("/api/notifications")
                .then().statusCode(401);
    }

    @Test
    @DisplayName("GET /api/notifications с токеном -> 200 и пустой список")
    void listWithToken() {
        given().header("Authorization", "Bearer " + token)
                .when().get("/api/notifications")
                .then().statusCode(200)
                .body("$", hasSize(0));
    }

    @Test
    @DisplayName("PATCH меняет статус прочтения своего уведомления в обе стороны")
    void updateReadStatus() {
        Long id = createNotification();

        for (boolean read : new boolean[]{true, true, false}) {
            given().header("Authorization", "Bearer " + token)
                    .contentType(ContentType.JSON)
                    .body(Map.of("read", read))
                    .when().patch("/api/notifications/{id}/read", id)
                    .then().statusCode(200)
                    .body("read", equalTo(read));

            given().header("Authorization", "Bearer " + token)
                    .when().get("/api/notifications")
                    .then().statusCode(200)
                    .body("[0].read", equalTo(read))
                    .body("[0].status", equalTo("PENDING"));
        }
    }

    @Test
    @DisplayName("PATCH чужого уведомления возвращает 404")
    void updateAnotherUsersNotification() {
        Long id = createNotification();
        registerAndLogin();

        given().header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of("read", true))
                .when().patch("/api/notifications/{id}/read", id)
                .then().statusCode(404);
    }

    @Test
    @DisplayName("PATCH без статуса прочтения возвращает 400")
    void updateWithoutReadStatus() {
        given().header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body("{}")
                .when().patch("/api/notifications/{id}/read", createNotification())
                .then().statusCode(400);
    }

    private Long createNotification() {
        var user = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        SubscriptionEntity subscription = new SubscriptionEntity();
        subscription.setUser(user);
        subscription.setCategory(categoryRepository.findAll().getFirst());
        subscription.setName("Netflix");
        subscription.setAmount(BigDecimal.TEN);
        subscription.setCurrency(Currency.RUB);
        subscription.setNextPaymentDate(LocalDate.now().plusMonths(1));
        subscription.setPeriod(PeriodType.MONTHLY);
        subscription.setStatus("ACTIVE");

        NotificationEntity notification = new NotificationEntity();
        notification.setUserId(user.getUserId());
        notification.setSubscriptionId(subscriptionRepository.save(subscription).getId());
        notification.setType(NotificationType.PAYMENT_REMINDER);
        notification.setMessage("Скоро списание");
        notification.setScheduledAt(OffsetDateTime.now());
        notification.setStatus("PENDING");
        return notificationRepository.save(notification).getId();
    }

    @Test
    @DisplayName("PUT /api/notifications/settings/telegram сохраняет chatId")
    void updateTelegramSettings() {
        given().header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of("telegramChatId", "123456789"))
                .when().put("/api/notifications/settings/telegram")
                .then().statusCode(204);
    }

    @Test
    @DisplayName("POST /api/notifications/telegram/send возвращает 204")
    void sendToTelegram() {
        given().header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of("telegramChatId", "123456789"))
                .when().put("/api/notifications/settings/telegram");

        given().header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(Map.of("message", "Привет из теста"))
                .when().post("/api/notifications/telegram/send")
                .then().statusCode(204);
    }
}
