
package ru.ivt.subscriptiontracker.app.dashboard;

import io.restassured.http.ContentType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import ru.ivt.subscriptiontracker.app.category.entity.CategoryEntity;
import ru.ivt.subscriptiontracker.app.category.repository.CategoryRepository;
import ru.ivt.subscriptiontracker.app.login.BaseApiTest;
import ru.ivt.subscriptiontracker.app.subscription.entity.Currency;
import ru.ivt.subscriptiontracker.app.subscription.entity.PeriodType;
import ru.ivt.subscriptiontracker.app.subscription.entity.SubscriptionEntity;
import ru.ivt.subscriptiontracker.app.subscription.repository.SubscriptionRepository;
import ru.ivt.subscriptiontracker.app.user.entity.User;
import ru.ivt.subscriptiontracker.app.user.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@DisplayName("Интеграционные тесты Dashboard API")
class DashboardIntegrationTest extends BaseApiTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    private String createAuthorizedUser() {
        String email = "dashboard_" + UUID.randomUUID() + "@example.com";
        String password = "Password123!";

        given()
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "email", email,
                        "password", password,
                        "confirmPassword", password,
                        "personalDataConsent", true
                ))
                .when()
                .post("/api/auth/register")
                .then()
                .statusCode(201);

        return given()
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "email", email,
                        "password", password
                ))
                .when()
                .post("/api/auth/login")
                .then()
                .statusCode(200)
                .extract()
                .path("token");
    }

    private void createSubscription(String email, LocalDate paymentDate) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow();

        CategoryEntity category = categoryRepository.findAll()
                .stream()
                .filter(item -> "Развлечения".equals(item.getName()))
                .findFirst()
                .orElseThrow();

        SubscriptionEntity subscription = new SubscriptionEntity();
        subscription.setUser(user);
        subscription.setCategory(category);
        subscription.setName("Netflix");
        subscription.setAmount(new BigDecimal("599.00"));
        subscription.setCurrency(Currency.RUB);
        subscription.setNextPaymentDate(paymentDate);
        subscription.setPeriod(PeriodType.MONTHLY);
        subscription.setStatus("ACTIVE");

        subscriptionRepository.save(subscription);
    }

    @Test
    @DisplayName("Запрос без токена отклоняется")
    void rejectsRequestWithoutToken() {
        given()
                .when()
                .get("/api/dashboard/summary")
                .then()
                .statusCode(401);
    }

    @ParameterizedTest
    @CsvSource({
            "upcoming, limit, 0",
            "upcoming, limit, abc",
            "categories, threshold, 101",
            "categories, threshold, abc",
            "summary, month, 2026-13"
    })
    @DisplayName("Некорректные параметры Dashboard возвращают ApiError со статусом 400")
    void rejectsInvalidDashboardParameter(String endpoint, String parameter, String value) {
        given()
                .header("Authorization", "Bearer " + createAuthorizedUser())
                .queryParam(parameter, value)
                .when()
                .get("/api/dashboard/" + endpoint)
                .then()
                .statusCode(400)
                .contentType(ContentType.JSON)
                .body("status", is(400))
                .body("timestamp", notNullValue())
                .body("message", not(isEmptyOrNullString()));
    }

    @Test
    @DisplayName("Авторизованный пользователь получает данные Dashboard")
    void returnsDashboardData() {
        String email = "dashboard_" + UUID.randomUUID() + "@example.com";
        String password = "Password123!";

        given()
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "email", email,
                        "password", password,
                        "confirmPassword", password,
                        "personalDataConsent", true
                ))
                .when()
                .post("/api/auth/register")
                .then()
                .statusCode(201);

        String token = given()
                .contentType(ContentType.JSON)
                .body(Map.of(
                        "email", email,
                        "password", password
                ))
                .when()
                .post("/api/auth/login")
                .then()
                .statusCode(200)
                .extract()
                .path("token");

        YearMonth month = YearMonth.now().plusMonths(1);
        LocalDate paymentDate = month.atDay(10);

        createSubscription(email, paymentDate);

        given()
                .header("Authorization", "Bearer " + token)
                .queryParam("month", month.toString())
                .when()
                .get("/api/dashboard/summary")
                .then()
                .statusCode(200)
                .body("month", equalTo(month.toString()))
                .body("currencies", hasSize(1))
                .body("currencies[0].currency", equalTo("RUB"))
                .body("currencies[0].monthlyEquivalent", is(599))
                .body("currencies[0].actualCharges", is(599.0f));

        given()
                .header("Authorization", "Bearer " + token)
                .queryParam("month", month.toString())
                .when()
                .get("/api/dashboard/categories")
                .then()
                .statusCode(200)
                .body("month", equalTo(month.toString()))
                .body("currencies", hasSize(1))
                .body("currencies[0].totalAmount", is(599.0f))
                .body("currencies[0].categories", hasSize(1))
                .body("currencies[0].categories[0].categoryName", equalTo("Развлечения"))
                .body("currencies[0].categories[0].amount", is(599.0f))
                .body("currencies[0].categories[0].percentage", is(100.0f));

        given()
                .header("Authorization", "Bearer " + token)
                .queryParam("limit", 4)
                .when()
                .get("/api/dashboard/upcoming")
                .then()
                .statusCode(200)
                .body("payments", hasSize(1))
                .body("payments[0].subscriptionName", equalTo("Netflix"))
                .body("payments[0].amount", is(599.0f))
                .body("payments[0].currency", equalTo("RUB"))
                .body("payments[0].paymentDate", equalTo(paymentDate.toString()))
                .body("totalCount", equalTo(1))
                .body("totals[0].amount", is(599.0f));
    }
}
