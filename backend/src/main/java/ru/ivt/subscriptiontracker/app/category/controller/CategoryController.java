package ru.ivt.subscriptiontracker.app.category.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.ivt.subscriptiontracker.app.category.dto.CategoryResponse;
import ru.ivt.subscriptiontracker.app.category.service.CategoryService;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Tag(name = "Categories", description = "API для получения категорий")
public class CategoryController {

    private final CategoryService categoryService;

    @Operation(summary = "Получить список категорий", description = "Возвращает список " +
            "категорий (может быть пустым)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Данные о всех категориях успешно получены")
    })
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping
    public List<CategoryResponse> getAllCategories() {
        return categoryService.getAllCategories();
    }
}