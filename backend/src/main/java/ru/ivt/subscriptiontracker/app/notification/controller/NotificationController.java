package ru.ivt.subscriptiontracker.app.notification.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.ivt.subscriptiontracker.app.notification.dto.NotificationResponse;
import ru.ivt.subscriptiontracker.app.notification.dto.NotificationSettingsRequest;
import ru.ivt.subscriptiontracker.app.notification.dto.TelegramSendRequest;
import ru.ivt.subscriptiontracker.app.notification.service.NotificationService;

import java.util.List;

@RestController
@AllArgsConstructor
@RequestMapping("/api/notifications")
@Tag(name = "Notifications", description = "Уведомления текущего пользователя")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "Получить свои уведомления")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Список уведомлений"),
            @ApiResponse(responseCode = "401", description = "Требуется авторизация")
    })
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> myNotifications() {
        return ResponseEntity.ok(notificationService.myNotifications());
    }

    @Operation(summary = "Отправить сообщение в Telegram текущего пользователя")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Сообщение отправлено"),
            @ApiResponse(responseCode = "400", description = "Ошибка валидации"),
            @ApiResponse(responseCode = "401", description = "Требуется авторизация")
    })
    @PostMapping("/telegram/send")
    public ResponseEntity<Void> sendToTelegram(
            @Valid @RequestBody TelegramSendRequest request) {
        notificationService.sendToTelegram(request.message());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Сохранить Telegram chat id текущего пользователя")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Настройки сохранены"),
            @ApiResponse(responseCode = "400", description = "Ошибка валидации"),
            @ApiResponse(responseCode = "401", description = "Требуется авторизация")
    })
    @PutMapping("/settings/telegram")
    public ResponseEntity<Void> updateTelegramSettings(
            @Valid @RequestBody NotificationSettingsRequest request) {
        notificationService.updateTelegramChatId(request.telegramChatId());
        return ResponseEntity.noContent().build();
    }
}