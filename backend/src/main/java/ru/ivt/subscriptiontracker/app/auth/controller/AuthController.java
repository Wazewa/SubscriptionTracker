package ru.ivt.subscriptiontracker.app.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import ru.ivt.subscriptiontracker.app.auth.dto.AuthResponse;
import ru.ivt.subscriptiontracker.app.auth.dto.ChangePasswordRequest;
import ru.ivt.subscriptiontracker.app.auth.dto.LoginRequest;
import ru.ivt.subscriptiontracker.app.auth.dto.RegisterRequest;
import ru.ivt.subscriptiontracker.app.user.dto.UserResponse;
import ru.ivt.subscriptiontracker.app.auth.service.AuthService;

@RestController
@Tag(name = "Authentication", description = "Управление аутентификацией и регистрацией пользователей")
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }


    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Пользователь успешно зарегистрирован"),
            @ApiResponse(responseCode = "400", description = "Невалидные данные"),
            @ApiResponse(responseCode = "409", description = "Пользователь с таким email уже существует")
    })
    @Operation(summary = "Зарегистрировать пользователя", description = "Регистрирует пользователя " +
            "при помощи почты и пароля")
    @SecurityRequirements
    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(authService.register(request));
    }

    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Пользователь успешно аутентифицирован"),
            @ApiResponse(responseCode = "400", description = "Невалидные данные"),
            @ApiResponse(responseCode = "401", description = "Неверный email или пароль")
    })
    @Operation(summary = "Аутентифицировать пользователя", description = "Аутентифицирует пользователя " +
            "при помощи почты и пароля")
    @SecurityRequirements
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request
    ) {
        return ResponseEntity.ok(authService.login(request));
    }

    @Operation(summary = "Получить текущего пользователя", description = "Возвращает данные профиля " +
            "авторизованного пользователя")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Данные пользователя успешно получены"),
            @ApiResponse(responseCode = "401", description = "Требуется авторизация")
    })
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                authService.getCurrentUser(authentication.getName())
        );
    }

    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Пользователь успешно сменил пароль"),
            @ApiResponse(responseCode = "400", description = "Невалидные данные или неверный текущий пароль")
    })
    @Operation(summary = "Сменить пароль пользователя", description = "Меняет пароль пользователя")
    @SecurityRequirement(name = "bearerAuth")
    @PatchMapping("/change-password")
    public ResponseEntity<Void> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        authService.changePassword(authentication.getName(), request);
        return ResponseEntity.noContent().build();
    }

}