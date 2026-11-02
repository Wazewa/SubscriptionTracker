package ru.ivt.subscriptiontracker.app.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Данные, полученные фронтендом от VK ID после редиректа (Authorization Code + PKCE)")
public record VkAuthRequest(

        @Schema(description = "Одноразовый код авторизации из query-параметра code")
        @NotBlank
        String code,

        @Schema(description = "PKCE code_verifier, сгенерированный на фронтенде")
        @NotBlank
        String codeVerifier,

        @Schema(description = "Идентификатор устройства из query-параметра device_id")
        @NotBlank
        String deviceId,

        @Schema(description = "Параметр state, который фронтенд отправлял в VK ID")
        @NotBlank
        String state
) {
}
