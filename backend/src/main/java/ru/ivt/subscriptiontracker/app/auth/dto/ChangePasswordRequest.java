package ru.ivt.subscriptiontracker.app.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Запрос на смену пароля")
public record ChangePasswordRequest(

        @Schema(description = "Текущий пароль", example = "OldPass123!", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank(message = "Current password is required")
        String currentPassword,

        @Schema(description = "Новый пароль (от 8 до 72 символов)", example = "NewSecurePass123!", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank(message = "New password is required")
        @Size(min = 8, max = 72, message = "New password must be between 8 and 72 characters")
        String newPassword,

        @Schema(description = "Подтверждение нового пароля", example = "NewSecurePass123!", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotBlank(message = "Password confirmation is required")
        String confirmNewPassword
) {
}