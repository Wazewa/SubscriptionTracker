package ru.ivt.subscriptiontracker.app.category.dto;

public record CategoryResponse(
        Long categoryId,
        String name,
        String description
) {
}