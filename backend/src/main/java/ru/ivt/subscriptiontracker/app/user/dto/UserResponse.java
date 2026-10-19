package ru.ivt.subscriptiontracker.app.user.dto;

public record UserResponse(
        Long userId,
        String email,
        String baseCurrency,
        String status
) {
}