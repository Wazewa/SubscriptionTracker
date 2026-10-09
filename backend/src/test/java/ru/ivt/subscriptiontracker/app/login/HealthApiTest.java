package ru.ivt.subscriptiontracker.app.login;

import io.restassured.RestAssured;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

class HealthApiTest {

    @Test
    void shouldReturnOkStatus() {
        RestAssured.baseURI = "http://localhost:8080";

        given()
                .when()
                .get("/health")
                .then()
                .statusCode(200)
                .body("status", equalTo("ok"));
    }
}