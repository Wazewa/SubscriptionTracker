package ru.ivt.subscriptiontracker.app.login;

import io.restassured.RestAssured;
import org.junit.jupiter.api.BeforeAll;

public abstract class BaseApiTest {

    @BeforeAll
    public static void setup() {
        String baseUri = System.getProperty("base.uri", "http://localhost:8080");
        RestAssured.baseURI = baseUri;
        RestAssured.enableLoggingOfRequestAndResponseIfValidationFails();
    }
}