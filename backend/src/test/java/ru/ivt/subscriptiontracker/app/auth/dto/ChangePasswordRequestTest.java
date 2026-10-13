package ru.ivt.subscriptiontracker.app.auth.dto;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ChangePasswordRequestTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    @Test
    void validRequest_hasNoViolations() {
        var request = new ChangePasswordRequest("oldPassword123", "newPassword123", "newPassword123");

        assertTrue(validator.validate(request).isEmpty());
    }

    @Test
    void blankFields_giveViolationsForAllThree() {
        var request = new ChangePasswordRequest("", "", "");

        Set<ConstraintViolation<ChangePasswordRequest>> violations = validator.validate(request);

        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("currentPassword")));
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("newPassword")));
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("confirmNewPassword")));
    }

    @Test
    void shortNewPassword_violatesSize() {
        var request = new ChangePasswordRequest("oldPassword123", "short1", "short1");

        Set<ConstraintViolation<ChangePasswordRequest>> violations = validator.validate(request);

        assertEquals(1, violations.size());
        assertEquals("New password must be between 8 and 72 characters",
                violations.iterator().next().getMessage());
    }

    @Test
    void tooLongNewPassword_violatesSize() {
        String tooLong = "a".repeat(73);
        var request = new ChangePasswordRequest("oldPassword123", tooLong, tooLong);

        assertEquals(1, validator.validate(request).size());
    }
}