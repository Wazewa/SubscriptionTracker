package ru.ivt.subscriptiontracker.app.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.ivt.subscriptiontracker.app.auth.dto.AuthResponse;
import ru.ivt.subscriptiontracker.app.auth.dto.ChangePasswordRequest;
import ru.ivt.subscriptiontracker.app.auth.dto.LoginRequest;
import ru.ivt.subscriptiontracker.app.auth.dto.RegisterRequest;
import ru.ivt.subscriptiontracker.app.user.dto.UserResponse;
import ru.ivt.subscriptiontracker.app.auth.exception.InvalidCredentialsException;
import ru.ivt.subscriptiontracker.app.auth.exception.InvalidPasswordChangeException;
import ru.ivt.subscriptiontracker.app.auth.exception.InvalidRegistrationException;
import ru.ivt.subscriptiontracker.app.user.exception.UserAlreadyExistsException;
import ru.ivt.subscriptiontracker.app.user.exception.UserNotFoundException;
import ru.ivt.subscriptiontracker.app.user.entity.User;
import ru.ivt.subscriptiontracker.app.user.repository.UserRepository;

import java.util.Locale;

@Slf4j
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {

        if (!request.personalDataConsent()) {
            throw new InvalidRegistrationException(
                    "Consent to personal data processing is required"
            );
        }

        if (!request.password().equals(request.confirmPassword())) {
            throw new InvalidRegistrationException(
                    "Passwords do not match"
            );
        }

        String normalizedEmail = request.email()
                .trim()
                .toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            log.warn("Registration attempt with existing email");
            throw new UserAlreadyExistsException(
                    "User with this email already exists"
            );
        }

        User user = new User();

        user.setEmail(normalizedEmail);
        user.setPasswordHash(
                passwordEncoder.encode(request.password())
        );
        user.setBaseCurrency("RUB");
        user.setStatus("PENDING");

        User savedUser = userRepository.save(user);

        log.info("Registered new user with id={}", savedUser.getUserId());

        return new UserResponse(
                savedUser.getUserId(),
                savedUser.getEmail(),
                savedUser.getBaseCurrency(),
                savedUser.getStatus()
        );
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {

        String normalizedEmail = request.email()
                .trim()
                .toLowerCase(Locale.ROOT);

        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> {
                    log.warn("Failed login attempt for non-existent email"); // Не пишем сам email
                    return new InvalidCredentialsException("Invalid email or password");
                });

        if (!passwordEncoder.matches(
                request.password(),
                user.getPasswordHash()
        )) {
            log.warn("Failed login attempt for user id={}", user.getUserId());
            throw new InvalidCredentialsException(
                    "Invalid email or password"
            );
        }

        String token = jwtService.generateToken(
                user.getUserId(),
                user.getEmail(),
                user.getTokenVersion()
        );
        log.info("User id={} successfully logged in", user.getUserId());

        return new AuthResponse(token);
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String email) {

        String normalizedEmail = email.trim()
                .toLowerCase(Locale.ROOT);

        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new UserNotFoundException(
                        "User not found"
                ));

        return new UserResponse(
                user.getUserId(),
                user.getEmail(),
                user.getBaseCurrency(),
                user.getStatus()
        );
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {

        if (!request.newPassword().equals(request.confirmNewPassword())) {
            throw new InvalidPasswordChangeException(
                    "Passwords do not match"
            );
        }

        String normalizedEmail = email.trim()
                .toLowerCase(Locale.ROOT);

        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new UserNotFoundException(
                        "User not found"
                ));

        if (!passwordEncoder.matches(
                request.currentPassword(),
                user.getPasswordHash()
        )) {
            throw new InvalidPasswordChangeException(
                    "Current password is incorrect"
            );
        }

        if (passwordEncoder.matches(
                request.newPassword(),
                user.getPasswordHash()
        )) {
            throw new InvalidPasswordChangeException(
                    "New password must be different from the current one"
            );
        }
        
        user.setPasswordHash(
                passwordEncoder.encode(request.newPassword())
        );
        user.setTokenVersion(user.getTokenVersion() + 1);

        userRepository.save(user);

        log.info("User id={} changed password and invalidated old tokens", user.getUserId());
    }
}