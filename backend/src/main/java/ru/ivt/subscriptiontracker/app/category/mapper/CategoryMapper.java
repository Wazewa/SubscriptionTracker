package ru.ivt.subscriptiontracker.app.category.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import ru.ivt.subscriptiontracker.app.category.dto.CategoryResponse;
import ru.ivt.subscriptiontracker.app.category.entity.CategoryEntity;

@Mapper(componentModel = "spring")
public interface CategoryMapper {

    @Mapping(source = "id", target = "categoryId")
    CategoryResponse toResponse(CategoryEntity category);
}