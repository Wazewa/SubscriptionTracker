package ru.ivt.subscriptiontracker.app.auth;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import ru.ivt.subscriptiontracker.app.auth.service.JwtService;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class VkAuthIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18");

    static final FakeVk VK = FakeVk.start();

    @DynamicPropertySource
    static void vkProperties(DynamicPropertyRegistry registry) {
        registry.add("vk.client-id", () -> "test-client");
        registry.add("vk.redirect-uri", () -> "http://localhost");
        registry.add("vk.token-url", () -> VK.baseUrl() + "/oauth2/auth");
        registry.add("vk.user-info-url", () -> VK.baseUrl() + "/oauth2/user_info");
        registry.add("jwt.secret", () -> "test-secret-key-test-secret-key-test-secret-key-1234");
        registry.add("jwt.access-ttl-seconds", () -> "3600");
    }

    @Value("${local.server.port}")
    int port;

    @Autowired
    JdbcTemplate jdbc;

    @BeforeEach
    void reset() {
        jdbc.execute("TRUNCATE user_identities, users RESTART IDENTITY CASCADE");
        VK.reset();
    }

    @AfterAll
    static void stopVk() {
        VK.stop();
    }

    @Autowired
    JwtService jwtService;

    private String tokenFrom(HttpResponse<String> response) {
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("\"token\"\\s*:\\s*\"([^\"]+)\"")
                .matcher(response.body());
        assertTrue(m.find(), "token not found in response: " + response.body());
        return m.group(1);
    }

    @Test
    void firstLoginCreatesUserAndIdentityInDb() throws Exception {
        VK.userId = "42";
        VK.email = "Mail@Vk.com";

        HttpResponse<String> response = login();

        assertEquals(200, response.statusCode());
        String token = tokenFrom(response);
        assertTrue(jwtService.isTokenValid(token));
        assertEquals("mail@vk.com", jwtService.extractEmail(token));
        assertEquals(
                jwtService.extractUserId(token),
                jdbc.queryForObject("select user_id from users", Long.class));
        assertEquals(1, count("users"));
        assertEquals(1, count("user_identities"));
        assertEquals("mail@vk.com", jdbc.queryForObject("select email from users", String.class));
        assertEquals("PENDING", jdbc.queryForObject("select status from users", String.class));
        assertNull(jdbc.queryForObject("select password_hash from users", String.class));
        assertEquals("42", jdbc.queryForObject(
                "select provider_user_id from user_identities where provider = 'VK'", String.class));
    }

    @Test
    void secondLoginReusesSameUser() throws Exception {
        VK.userId = "42";
        VK.email = "mail@vk.com";

        assertEquals(200, login().statusCode());
        assertEquals(200, login().statusCode());

        assertEquals(1, count("users"));
        assertEquals(1, count("user_identities"));
    }
    
    @Test
    void missingVkEmailUsesSyntheticEmail() throws Exception {
        VK.userId = "42";
        VK.email = null;

        assertEquals(200, login().statusCode());

        assertEquals("vk_42@vk.local", jdbc.queryForObject(
                "select u.email from users u join user_identities i on i.user_id = u.user_id", String.class));
    }

    @Test
    void takenEmailIsNotLinkedAndSyntheticEmailIsUsed() throws Exception {
        insertPasswordUser("taken@mail.com");
        VK.userId = "42";
        VK.email = "taken@mail.com";

        assertEquals(200, login().statusCode());

        assertEquals(2, count("users"));
        assertEquals("vk_42@vk.local", jdbc.queryForObject(
                "select u.email from users u join user_identities i on i.user_id = u.user_id", String.class));
    }

    @Test
    void syntheticEmailCollisionGetsUniqueSuffix() throws Exception {
        insertPasswordUser("vk_42@vk.local");
        VK.userId = "42";
        VK.email = null;

        assertEquals(200, login().statusCode());

        String email = jdbc.queryForObject(
                "select u.email from users u join user_identities i on i.user_id = u.user_id", String.class);
        assertTrue(email.startsWith("vk_42_") && email.endsWith("@vk.local"));
    }

    @Test
    void vkRejectsCodeReturns401AndCreatesNothing() throws Exception {
        VK.rejectExchange = true;

        HttpResponse<String> response = login();

        assertEquals(401, response.statusCode());
        assertEquals(0, count("users"));
        assertEquals(0, count("user_identities"));
    }

    @Test
    void backendSendsExpectedParametersToVk() throws Exception {
        VK.userId = "42";

        login();

        String form = VK.lastTokenForm;
        assertTrue(form.contains("grant_type=authorization_code"));
        assertTrue(form.contains("code=some-code"));
        assertTrue(form.contains("code_verifier=verifier"));
        assertTrue(form.contains("device_id=device"));
        assertTrue(form.contains("state=state"));
        assertTrue(form.contains("client_id=test-client"));
        assertTrue(form.contains("redirect_uri=http%3A%2F%2Flocalhost"));
    }


    private HttpResponse<String> login() throws Exception {
        String json = """
                {"code":"some-code","codeVerifier":"verifier","deviceId":"device","state":"state"}""";
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/auth/vk"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
        return HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
    }

    private int count(String table) {
        return jdbc.queryForObject("select count(*) from " + table, Integer.class);
    }

    private void insertPasswordUser(String email) {
        jdbc.update("""
                insert into users (email, base_currency, status, password_hash, token_version)
                values (?, 'RUB', 'PENDING', 'hash', 0)""", email);
    }

    static class FakeVk {
        private final HttpServer server;
        volatile String userId = "42";
        volatile String email = "user@vk.com";
        volatile boolean rejectExchange;
        volatile String lastTokenForm = "";

        private FakeVk(HttpServer server) {
            this.server = server;
        }

        static FakeVk start() {
            try {
                HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
                FakeVk vk = new FakeVk(server);
                server.createContext("/oauth2/auth", exchange -> {
                    vk.lastTokenForm = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                    String body = vk.rejectExchange
                            ? "{\"error\":\"invalid_grant\"}"
                            : "{\"access_token\":\"at\",\"refresh_token\":\"rt\",\"user_id\":" + vk.userId + "}";
                    respond(exchange, vk.rejectExchange ? 400 : 200, body);
                });
                server.createContext("/oauth2/user_info", exchange -> {
                    String user = vk.email == null ? "{}" : "{\"email\":\"" + vk.email + "\"}";
                    respond(exchange, 200, "{\"user\":" + user + "}");
                });
                server.start();
                return vk;
            } catch (IOException e) {
                throw new IllegalStateException(e);
            }
        }

        private static void respond(com.sun.net.httpserver.HttpExchange exchange, int status, String body)
                throws IOException {
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        }

        String baseUrl() {
            return "http://localhost:" + server.getAddress().getPort();
        }

        void reset() {
            userId = "42";
            email = "user@vk.com";
            rejectExchange = false;
            lastTokenForm = "";
        }

        void stop() {
            server.stop(0);
        }
    }
}