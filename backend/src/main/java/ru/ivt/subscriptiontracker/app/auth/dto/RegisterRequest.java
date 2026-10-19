package ru.ivt.subscriptiontracker.app.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Запрос на регистрацию нового пользователя")
public record RegisterRequest(

        @Schema(description = "Email пользователя", example = "newuser@example.com", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank(message = "Email is required")
        @Email(message = "Email must be valid")
        String email,

        @Schema(description = "Пароль (минимум 8 символов)", example = "SecurePass123!", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must contain at least 8 characters")
        String password,

        @Schema(description = "Подтверждение пароля (должно совпадать с password)", example = "SecurePass123!", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank(message = "Password confirmation is required")
        String confirmPassword,

        @Schema(description = "Согласие на обработку персональных данных", example = "true", requiredMode = Schema.RequiredMode.REQUIRED)
        @AssertTrue(message = "Consent to personal data processing is required")
        boolean personalDataConsent

) {
}