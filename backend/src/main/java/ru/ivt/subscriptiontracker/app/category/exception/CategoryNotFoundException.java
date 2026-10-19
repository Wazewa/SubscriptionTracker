
package ru.ivt.subscriptiontracker.app.category.exception;

public class CategoryNotFoundException extends RuntimeException {

    public CategoryNotFoundException(Long categoryId) {
        super("Category not found: " + categoryId);
    }
}
