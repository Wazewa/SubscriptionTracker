package ru.ivt.subscriptiontracker.app.register;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("test")
class AuthRegisterIntegrationTest  {

    @Container
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18")
            .withDatabaseName("subscriptions")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("jwt.secret",
                () -> "test-secret-at-least-256-bits-long-for-hs384-signing-key-abc");
    }

    @Autowired
    private Environment env;

    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    private HttpResponse<String> register(Map<String, Object> body) throws Exception {
        String baseUrl = "http://localhost:" + env.getProperty("local.server.port");
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/api/auth/register"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                .build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        return response;
    }

    private static Map<String, Object> body(String email, String password,
                                            String confirmPassword, boolean personalDataConsent) {
        return Map.of(
                "email", email,
                "password", password,
                "confirmPassword", confirmPassword,
                "personalDataConsent", personalDataConsent);
    }

    private static Map<String, Object> validBody(String email) {
        return body(email, "SecurePass123", "SecurePass123", true);
    }

    private static String uniqueEmail() {
        return "user_" + UUID.randomUUID() + "@example.com";
    }
    @Test
    @DisplayName("Успешная регистрация пользователя")
    void register_Success() throws Exception {
        String email = uniqueEmail();

        HttpResponse<String> response = register(validBody(email));

        assertEquals(201, response.statusCode());
        JsonNode json = mapper.readTree(response.body());
        assertEquals(email, json.get("email").asText());
        assertNotNull(json.get("userId"));
        assertFalse(json.has("password"), "Пароль не должен возвращаться в ответе");
        assertFalse(json.has("passwordHash"), "Хеш пароля не должен возвращаться в ответе");
    }

    @Test
    @DisplayName("Ошибка: регистрация с уже существующим email")
    void register_DuplicateEmail() throws Exception {
        String email = uniqueEmail();

        assertEquals(201, register(validBody(email)).statusCode());
        HttpResponse<String> second = register(validBody(email));

        assertEquals(409, second.statusCode());
    }

    @Test
    @DisplayName("Ошибка валидации: некорректный формат email")
    void register_InvalidEmail() throws Exception {
        HttpResponse<String> response = register(validBody("invalid-email-format"));

        assertEquals(400, response.statusCode());
    }

    @Test
    @DisplayName("Ошибка валидации: слишком короткий пароль")
    void register_ShortPassword() throws Exception {
        HttpResponse<String> response = register(body(uniqueEmail(), "123", "123", true));

        assertEquals(400, response.statusCode());
    }

    @Test
    @DisplayName("Ошибка валидации: нет согласия на обработку данных")
    void register_NoAgreement() throws Exception {
        HttpResponse<String> response =
                register(body(uniqueEmail(), "SecurePass123", "SecurePass123", false));

        assertEquals(400, response.statusCode());
    }
}