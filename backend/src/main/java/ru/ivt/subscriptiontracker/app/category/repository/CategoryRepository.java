package ru.ivt.subscriptiontracker.app.category.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.ivt.subscriptiontracker.app.category.entity.CategoryEntity;

public interface CategoryRepository extends JpaRepository<CategoryEntity, Long> {
}