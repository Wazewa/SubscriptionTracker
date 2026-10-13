package ru.ivt.subscriptiontracker.app.login;

import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

class HealthApiTest extends BaseApiTest {

    @Test
    void shouldReturnOkStatus() {
        given()
                .when()
                .get("/health")
                .then()
                .statusCode(200)
                .body("status", equalTo("ok"));
    }
}