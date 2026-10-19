
package ru.ivt.subscriptiontracker.app.login;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;



import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Интеграционные тесты модуля авторизации (/api/auth)")
public class AuthIntegrationTest extends BaseApiTest {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    private String validEmail;
    private final String validPassword = "Password123!";

    @BeforeEach
    void ensureUserExists() {
        validEmail = "test_user_" + UUID.randomUUID().toString().substring(0, 8)
                + "@gmail.com";

        Map<String, Object> registerRequest = Map.of(
                "email", validEmail,
                "password", validPassword,
                "confirmPassword", validPassword,
                "personalDataConsent", true
        );

        given()
                .contentType(ContentType.JSON)
                .body(registerRequest)
                .when()
                .post("/api/auth/register")
                .then()
                .statusCode(anyOf(is(201), is(409)));
    }

    @Nested
    @DisplayName("1.1 Позитивные сценарии")
    class PositiveScenarios {

        @Test
        @DisplayName("ID 1: Успешная авторизация (возвращает 200 и JWT токен)")
        void testSuccessfulLogin() {
            Map<String, String> loginRequest = Map.of(
                    "email", validEmail,
                    "password", validPassword
            );

            given()
                    .contentType(ContentType.JSON)
                    .body(loginRequest)
                    .when()
                    .post("/api/auth/login")
                    .then()
                    .statusCode(200)
                    .body("token", notNullValue())
                    .body("token", not(emptyOrNullString()));
        }

        @Test
        @DisplayName("ID 2: Проверка JWT после авторизации")
        void testJwtStructureAndClaims() throws Exception {
            Map<String, String> loginRequest = Map.of(
                    "email", validEmail,
                    "password", validPassword
            );

            String token = given()
                    .contentType(ContentType.JSON)
                    .body(loginRequest)
                    .when()
                    .post("/api/auth/login")
                    .then()
                    .statusCode(200)
                    .extract()
                    .path("token");

            String[] parts = token.split("\\.");
            assertEquals(3, parts.length);

            String headerJson = new String(
                    Base64.getUrlDecoder().decode(parts[0]),
                    StandardCharsets.UTF_8
            );

            JsonNode header = objectMapper.readTree(headerJson);

            assertEquals("HS384", header.get("alg").asText());

            String payloadJson = new String(
                    Base64.getUrlDecoder().decode(parts[1]),
                    StandardCharsets.UTF_8
            );

            JsonNode payload = objectMapper.readTree(payloadJson);

            assertTrue(payload.hasNonNull("sub"));
            assertEquals(validEmail, payload.get("sub").asText());

            assertTrue(payload.hasNonNull("userId"));
            assertTrue(payload.get("userId").asInt() > 0);

            assertTrue(payload.hasNonNull("iat"));
            assertTrue(payload.hasNonNull("exp"));

            long iat = payload.get("iat").asLong();
            long exp = payload.get("exp").asLong();

            assertTrue(exp > iat);
        }

        @Test
        @DisplayName("ID 3: Доступ с действующим JWT")
        void testAccessProtectedResourceWithValidToken() {
            Map<String, String> loginRequest = Map.of(
                    "email", validEmail,
                    "password", validPassword
            );

            String token = given()
                    .contentType(ContentType.JSON)
                    .body(loginRequest)
                    .when()
                    .post("/api/auth/login")
                    .then()
                    .statusCode(200)
                    .extract()
                    .path("token");

            given()
                    .header("Authorization", "Bearer " + token)
                    .when()
                    .get("/api/auth/me")
                    .then()
                    .statusCode(200)
                    .body("userId", notNullValue())
                    .body("email", equalTo(validEmail))
                    .body("baseCurrency", equalTo("RUB"))
                    .body("status", equalTo("PENDING"));
        }
    }

    @Nested
    @DisplayName("1.2 Негативные сценарии")
    class NegativeScenarios {

        @Test
        @DisplayName("ID 4: Неверный пароль -> 401")
        void testLoginWithWrongPassword() {
            Map<String, String> loginRequest = Map.of(
                    "email", validEmail,
                    "password", "WrongPassword999!"
            );

            given()
                    .contentType(ContentType.JSON)
                    .body(loginRequest)
                    .when()
                    .post("/api/auth/login")
                    .then()
                    .statusCode(401)
                    .body("status", equalTo(401))
                    .body("message", equalTo("Invalid email or password"))
                    .body("timestamp", notNullValue());
        }

        @Test
        @DisplayName("ID 5: Несуществующий email -> 401")
        void testLoginWithNonExistentEmail() {
            Map<String, String> loginRequest = Map.of(
                    "email", "unknown_user_" + UUID.randomUUID() + "@gmail.com",
                    "password", validPassword
            );

            given()
                    .contentType(ContentType.JSON)
                    .body(loginRequest)
                    .when()
                    .post("/api/auth/login")
                    .then()
                    .statusCode(401)
                    .body("status", equalTo(401))
                    .body("message", equalTo("Invalid email or password"))
                    .body("timestamp", notNullValue());
        }

        @Test
        @DisplayName("ID 6: Пустой email -> 400")
        void testLoginWithEmptyEmail() {
            Map<String, String> loginRequest = Map.of(
                    "email", "",
                    "password", validPassword
            );

            given()
                    .contentType(ContentType.JSON)
                    .body(loginRequest)
                    .when()
                    .post("/api/auth/login")
                    .then()
                    .statusCode(400)
                    .body("status", equalTo(400))
                    .body("message", equalTo("Email is required"))
                    .body("timestamp", notNullValue());
        }

        @Test
        @DisplayName("ID 7: Пустой пароль -> 400")
        void testLoginWithEmptyPassword() {
            Map<String, String> loginRequest = Map.of(
                    "email", validEmail,
                    "password", ""
            );

            given()
                    .contentType(ContentType.JSON)
                    .body(loginRequest)
                    .when()
                    .post("/api/auth/login")
                    .then()
                    .statusCode(400)
                    .body("status", equalTo(400))
                    .body("message", anyOf(
                            equalTo("Password is required"),
                            equalTo("Password must contain at least 8 characters")
                    ))
                    .body("timestamp", notNullValue());
        }

        @Test
        @DisplayName("ID 7.1: Короткий пароль -> 400")
        void testLoginWithShortPassword() {
            Map<String, String> loginRequest = Map.of(
                    "email", validEmail,
                    "password", "123"
            );

            given()
                    .contentType(ContentType.JSON)
                    .body(loginRequest)
                    .when()
                    .post("/api/auth/login")
                    .then()
                    .statusCode(400)
                    .body("status", equalTo(400))
                    .body("message", equalTo("Password must contain at least 8 characters"))
                    .body("timestamp", notNullValue());
        }

        @Test
        @DisplayName("ID 8: Некорректный формат email -> 400")
        void testLoginWithInvalidEmailFormat() {
            Map<String, String> loginRequest = Map.of(
                    "email", "ivanov.gmail.com",
                    "password", validPassword
            );

            given()
                    .contentType(ContentType.JSON)
                    .body(loginRequest)
                    .when()
                    .post("/api/auth/login")
                    .then()
                    .statusCode(400)
                    .body("status", equalTo(400))
                    .body("message", equalTo("Email must be valid"))
                    .body("timestamp", notNullValue());
        }

        @Test
        @DisplayName("ID 9: Отсутствующий JWT -> 401")
        void testAccessWithoutToken() {
            given()
                    .when()
                    .get("/api/auth/me")
                    .then()
                    .statusCode(401)
                    .body("status", equalTo(401))
                    .body("message", equalTo("Authentication is required"))
                    .body("timestamp", notNullValue());
        }

        @Test
        @DisplayName("ID 10: Некорректный JWT -> 401")
        void testAccessWithInvalidToken() {
            given()
                    .header("Authorization", "Bearer invalid.token.value")
                    .when()
                    .get("/api/auth/me")
                    .then()
                    .statusCode(401)
                    .body("status", equalTo(401))
                    .body("message", equalTo("Authentication is required"))
                    .body("timestamp", notNullValue());
        }

        @Test
        @DisplayName("ID 11: Просроченный JWT -> 401")
        void testAccessWithExpiredToken() {
            String expiredHeader = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(
                            "{\"alg\":\"HS384\",\"typ\":\"JWT\"}"
                                    .getBytes(StandardCharsets.UTF_8)
                    );

            String expiredPayload = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(
                            String.format(
                                    "{\"sub\":\"%s\",\"userId\":1,\"iat\":50000,\"exp\":100000}",
                                    validEmail
                            ).getBytes(StandardCharsets.UTF_8)
                    );

            String dummySignature = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(
                            "fakeSignatureForExpiredTokenCheck"
                                    .getBytes(StandardCharsets.UTF_8)
                    );

            String expiredToken = expiredHeader + "." + expiredPayload + "." + dummySignature;

            given()
                    .header("Authorization", "Bearer " + expiredToken)
                    .when()
                    .get("/api/auth/me")
                    .then()
                    .statusCode(401)
                    .body("status", equalTo(401))
                    .body("message", equalTo("Authentication is required"))
                    .body("timestamp", notNullValue());
        }

        @Test
        @DisplayName("ID 12: Изменённый JWT -> 401")
        void testAccessWithTamperedToken() {
            Map<String, String> loginRequest = Map.of(
                    "email", validEmail,
                    "password", validPassword
            );

            String validToken = given()
                    .contentType(ContentType.JSON)
                    .body(loginRequest)
                    .when()
                    .post("/api/auth/login")
                    .then()
                    .statusCode(200)
                    .extract()
                    .path("token");

            String tamperedToken =
                    validToken.substring(0, validToken.length() - 4) + "XyZ9";

            given()
                    .header("Authorization", "Bearer " + tamperedToken)
                    .when()
                    .get("/api/auth/me")
                    .then()
                    .statusCode(401)
                    .body("status", equalTo(401))
                    .body("message", equalTo("Authentication is required"))
                    .body("timestamp", notNullValue());
        }
        @Test
        @DisplayName("ID 13: Успешная авторизация с email в другом регистре (регистронезависимость)")
        void testSuccessfulLoginWithDifferentCaseEmail() {
            // validEmail создается в beforeEach в нижнем регистре
            String mixedCaseEmail = validEmail.toUpperCase();

            Map<String, String> loginRequest = Map.of(
                    "email", mixedCaseEmail,
                    "password", validPassword
            );

            given()
                    .contentType(ContentType.JSON)
                    .body(loginRequest)
                    .when()
                    .post("/api/auth/login")
                    .then()
                    .statusCode(200)
                    .body("token", notNullValue())
                    .body("token", not(emptyOrNullString()));
        }
    }
}