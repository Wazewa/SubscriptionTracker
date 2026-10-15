package ru.ivt.subscriptiontracker.app.user.dto;

public record UserResponse(
        Integer userId,
        String email,
        String baseCurrency,
        String status
) {
}