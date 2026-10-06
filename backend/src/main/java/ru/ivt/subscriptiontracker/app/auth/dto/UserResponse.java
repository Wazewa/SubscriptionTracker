package ru.ivt.subscriptiontracker.app.auth.dto;

public record UserResponse(
        Integer userId,
        String email,
        String baseCurrency,
        String status
) {
}