package ru.ivt.subscriptiontracker.app.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "Стандартная модель ошибки API")
public record ApiError(

        @Schema(description = "Время возникновения ошибки")
        Instant timestamp,

        @Schema(description = "HTTP статус код", example = "404")
        int status,

        @Schema(description = "Сообщение об ошибке", example = "Subscription not found")
        String message
) {}