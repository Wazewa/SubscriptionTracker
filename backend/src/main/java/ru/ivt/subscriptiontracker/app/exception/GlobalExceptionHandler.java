package ru.ivt.subscriptiontracker.app.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import ru.ivt.subscriptiontracker.app.auth.exception.InvalidCredentialsException;
import ru.ivt.subscriptiontracker.app.auth.exception.InvalidPasswordChangeException;
import ru.ivt.subscriptiontracker.app.auth.exception.InvalidRegistrationException;
import ru.ivt.subscriptiontracker.app.dto.response.ApiError;
import ru.ivt.subscriptiontracker.app.user.exception.UserAlreadyExistsException;
import ru.ivt.subscriptiontracker.app.user.exception.UserNotFoundException;

import java.time.Instant;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidationException(
            MethodArgumentNotValidException exception
    ) {
        String message = exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("Validation failed");

        return buildError(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(InvalidRegistrationException.class)
    public ResponseEntity<ApiError> handleInvalidRegistration(
            InvalidRegistrationException exception
    ) {
        return buildError(
                HttpStatus.BAD_REQUEST,
                exception.getMessage()
        );
    }

    @ExceptionHandler(InvalidPasswordChangeException.class)
    public ResponseEntity<ApiError> handleInvalidPasswordChange(
            InvalidPasswordChangeException exception
    ) {
        return buildError(
                HttpStatus.BAD_REQUEST,
                exception.getMessage()
        );
    }

    @ExceptionHandler(UserAlreadyExistsException.class)
    public ResponseEntity<ApiError> handleUserAlreadyExists(
            UserAlreadyExistsException exception
    ) {
        return buildError(
                HttpStatus.CONFLICT,
                exception.getMessage()
        );
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiError> handleInvalidCredentials(
            InvalidCredentialsException exception
    ) {
        return buildError(
                HttpStatus.UNAUTHORIZED,
                exception.getMessage()
        );
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ApiError> handleUserNotFound(
            UserNotFoundException exception
    ) {
        return buildError(
                HttpStatus.NOT_FOUND,
                exception.getMessage()
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleException(Exception exception) {
        return buildError(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Internal server error"
        );
    }

    private ResponseEntity<ApiError> buildError(
            HttpStatus status,
            String message
    ) {
        ApiError error = new ApiError(
                Instant.now(),
                status.value(),
                message
        );

        return ResponseEntity
                .status(status)
                .body(error);
    }
}