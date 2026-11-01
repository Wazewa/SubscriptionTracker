package ru.ivt.subscriptiontracker.app.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.ivt.subscriptiontracker.app.auth.dto.AuthResponse;
import ru.ivt.subscriptiontracker.app.auth.dto.VkAuthRequest;
import ru.ivt.subscriptiontracker.app.auth.service.VkAuthService;
import ru.ivt.subscriptiontracker.app.dto.response.ApiError;

@RestController
@Tag(name = "Authentication", description = "Управление аутентификацией и регистрацией пользователей")
@RequestMapping("/api/auth")
public class VkAuthController {

    private final VkAuthService vkAuthService;

    public VkAuthController(VkAuthService vkAuthService) {
        this.vkAuthService = vkAuthService;
    }

    @Operation(
            summary = "Войти через VK ID",
            description = "Принимает code, code_verifier, device_id и state, полученные фронтендом от VK ID " +
                    "(Authorization Code + PKCE). Обменивает код на токен VK, находит пользователя по VK ID " +
                    "или создаёт нового и возвращает JWT приложения."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Пользователь успешно аутентифицирован",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = AuthResponse.class))),
            @ApiResponse(responseCode = "400", description = "Невалидные данные",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ApiError.class))),
            @ApiResponse(responseCode = "401", description = "VK ID отклонил код авторизации",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ApiError.class)))
    })
    @SecurityRequirements
    @PostMapping("/vk")
    public ResponseEntity<AuthResponse> loginWithVk(
            @Valid @RequestBody VkAuthRequest request
    ) {
        return ResponseEntity.ok(vkAuthService.login(request));
    }
}