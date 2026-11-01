package ru.ivt.subscriptiontracker.app.changepassword;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;
import ru.ivt.subscriptiontracker.app.TestContainersConfig;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestContainersConfig.class)
@ActiveProfiles("test")
class AuthChangePasswordIntegrationTest {

    private static final String OLD_PASSWORD = "OldPassword123";
    private static final String NEW_PASSWORD = "NewPassword456";

    @Autowired
    private Environment env;

    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    private String baseUrl() {
        return "http://localhost:" + env.getProperty("local.server.port");
    }

    private HttpResponse<String> send(String method, String path, Map<String, Object> body,
                                      String token) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl() + path))
                .header("Content-Type", "application/json")
                .method(method, HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)));
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static String uniqueEmail() {
        return "user_" + UUID.randomUUID() + "@example.com";
    }

    private void register(String email, String password) throws Exception {
        HttpResponse<String> response = send("POST", "/api/auth/register", Map.of(
                "email", email,
                "password", password,
                "confirmPassword", password,
                "personalDataConsent", true), null);
        assertEquals(201, response.statusCode());
    }

    private HttpResponse<String> login(String email, String password) throws Exception {
        return send("POST", "/api/auth/login", Map.of("email", email, "password", password), null);
    }

    private String registerAndLogin(String email) throws Exception {
        register(email, OLD_PASSWORD);
        HttpResponse<String> response = login(email, OLD_PASSWORD);
        assertEquals(200, response.statusCode());
        String token = mapper.readTree(response.body()).get("token").asText();
        assertNotNull(token);
        return token;
    }

    private HttpResponse<String> changePassword(String token, String current,
                                                String newPassword, String confirm) throws Exception {
        return send("PATCH", "/api/auth/change-password", Map.of(
                "currentPassword", current,
                "newPassword", newPassword,
                "confirmNewPassword", confirm), token);
    }
    

    @Test
    @DisplayName("Успешная смена пароля: 204, старый пароль не работает, новый работает")
    void changePassword_Success() throws Exception {
        String email = uniqueEmail();
        String token = registerAndLogin(email);

        HttpResponse<String> response = changePassword(token, OLD_PASSWORD, NEW_PASSWORD, NEW_PASSWORD);

        assertEquals(204, response.statusCode());
        assertEquals(401, login(email, OLD_PASSWORD).statusCode());
        assertEquals(200, login(email, NEW_PASSWORD).statusCode());
    }

    @Test
    @DisplayName("Ошибка: неверный текущий пароль")
    void changePassword_WrongCurrentPassword() throws Exception {
        String token = registerAndLogin(uniqueEmail());

        HttpResponse<String> response = changePassword(token, "WrongPassword1", NEW_PASSWORD, NEW_PASSWORD);

        assertEquals(400, response.statusCode());
    }

    @Test
    @DisplayName("Ошибка: новый пароль и подтверждение не совпадают")
    void changePassword_ConfirmationMismatch() throws Exception {
        String token = registerAndLogin(uniqueEmail());

        HttpResponse<String> response = changePassword(token, OLD_PASSWORD, NEW_PASSWORD, "Other12345678");

        assertEquals(400, response.statusCode());
    }

    @Test
    @DisplayName("Ошибка: новый пароль совпадает с текущим")
    void changePassword_NewEqualsCurrent() throws Exception {
        String token = registerAndLogin(uniqueEmail());

        HttpResponse<String> response = changePassword(token, OLD_PASSWORD, OLD_PASSWORD, OLD_PASSWORD);

        assertEquals(400, response.statusCode());
    }

    @Test
    @DisplayName("Ошибка валидации: новый пароль короче 8 символов")
    void changePassword_ShortNewPassword() throws Exception {
        String token = registerAndLogin(uniqueEmail());

        HttpResponse<String> response = changePassword(token, OLD_PASSWORD, "short1", "short1");

        assertEquals(400, response.statusCode());
    }

    @Test
    @DisplayName("Ошибка валидации: новый пароль длиннее 72 символов")
    void changePassword_TooLongNewPassword() throws Exception {
        String token = registerAndLogin(uniqueEmail());
        String tooLong = "a".repeat(73);

        HttpResponse<String> response = changePassword(token, OLD_PASSWORD, tooLong, tooLong);

        assertEquals(400, response.statusCode());
    }

    @Test
    @DisplayName("Ошибка валидации: пустые поля")
    void changePassword_BlankFields() throws Exception {
        String token = registerAndLogin(uniqueEmail());

        HttpResponse<String> response = changePassword(token, "", "", "");

        assertEquals(400, response.statusCode());
    }

    @Test
    @DisplayName("Ошибка: запрос без токена")
    void changePassword_NoToken() throws Exception {
        HttpResponse<String> response = changePassword(null, OLD_PASSWORD, NEW_PASSWORD, NEW_PASSWORD);

        assertEquals(401, response.statusCode());
    }

    @Test
    @DisplayName("Ошибка: невалидный токен")
    void changePassword_InvalidToken() throws Exception {
        HttpResponse<String> response = changePassword("abc", OLD_PASSWORD, NEW_PASSWORD, NEW_PASSWORD);

        assertEquals(401, response.statusCode());
    }
}