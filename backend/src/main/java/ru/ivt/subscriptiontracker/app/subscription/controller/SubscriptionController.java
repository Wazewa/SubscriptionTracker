package ru.ivt.subscriptiontracker.app.subscription.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.ivt.subscriptiontracker.app.subscription.dto.SubscriptionRequest;
import ru.ivt.subscriptiontracker.app.subscription.dto.SubscriptionResponse;
import ru.ivt.subscriptiontracker.app.subscription.service.SubscriptionService;

import java.util.List;

@RestController
@AllArgsConstructor
@RequestMapping("/api/subscriptions")
@Tag(name = "Subscriptions", description = "Управление подписками текущего пользователя")
@SecurityRequirement(name = "bearerAuth")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @Operation(summary = "Получить свои подписки", description = "Возвращает список всех подписок текущего пользователя")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Список подписок успешно получен"),
            @ApiResponse(responseCode = "401", description = "Требуется авторизация")
    })
    @GetMapping("/me")
    public ResponseEntity<List<SubscriptionResponse>> getMySubscriptions() {
        return ResponseEntity.ok(subscriptionService.findMySubscriptions());
    }

    @Operation(summary = "Создать подписку", description = "Создает новую подписку для текущего пользователя")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Подписка успешно создана"),
            @ApiResponse(responseCode = "400", description = "Ошибка валидации переданных данных"),
            @ApiResponse(responseCode = "401", description = "Требуется авторизация"),
            @ApiResponse(responseCode = "404", description = "Указанная категория не найдена")
    })
    @PostMapping
    public ResponseEntity<SubscriptionResponse> createSubscription(
            @Valid @RequestBody SubscriptionRequest subscriptionRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(subscriptionService.createSubscription(subscriptionRequest));
    }

    @Operation(summary = "Обновить подписку", description = "Обновляет данные существующей подписки текущего пользователя. " +
            "Можно обновить только свою подписку.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Подписка успешно обновлена"),
            @ApiResponse(responseCode = "400", description = "Ошибка валидации переданных данных"),
            @ApiResponse(responseCode = "401", description = "Требуется авторизация"),
            @ApiResponse(responseCode = "404", description = "Подписка или категория не найдены")
    })
    @PutMapping("/{id}")
    public ResponseEntity<SubscriptionResponse> updateMySubscriptions(
            @Parameter(description = "ID подписки", example = "1")
            @PathVariable Long id,
            @Valid @RequestBody SubscriptionRequest subscriptionRequest) {
        return ResponseEntity.ok(subscriptionService.updateMySubscriptions(id, subscriptionRequest));
    }

    @Operation(summary = "Удалить подписку", description = "Удаляет подписку текущего пользователя по её ID")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Подписка успешно удалена"),
            @ApiResponse(responseCode = "401", description = "Требуется авторизация"),
            @ApiResponse(responseCode = "404", description = "Подписка не найдена")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMySubscriptions(
            @Parameter(description = "ID подписки", example = "1")
            @PathVariable Long id) {
        subscriptionService.deleteMySubscriptions(id);
        return ResponseEntity.noContent().build();
    }
}