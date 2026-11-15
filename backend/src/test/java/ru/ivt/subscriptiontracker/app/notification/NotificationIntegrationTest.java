package ru.ivt.subscriptiontracker.app.notification;

import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import ru.ivt.subscriptiontracker.app.login.BaseApiTest;

import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.hasSize;

@DisplayName("Интеграционные тесты уведомлений (/api/notifications)")
class NotificationIntegrationTest extends BaseApiTest {

    private String token;

    @BeforeEach
    void registerAndLogin() {
        String email = "notif_" + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
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