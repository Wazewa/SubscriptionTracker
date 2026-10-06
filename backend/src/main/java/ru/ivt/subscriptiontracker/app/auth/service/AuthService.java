package ru.ivt.subscriptiontracker.app.auth.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.ivt.subscriptiontracker.app.auth.dto.AuthResponse;
import ru.ivt.subscriptiontracker.app.auth.dto.LoginRequest;
import ru.ivt.subscriptiontracker.app.auth.dto.RegisterRequest;
import ru.ivt.subscriptiontracker.app.auth.dto.UserResponse;
import ru.ivt.subscriptiontracker.app.exception.InvalidCredentialsException;
import ru.ivt.subscriptiontracker.app.exception.InvalidRegistrationException;
import ru.ivt.subscriptiontracker.app.exception.UserAlreadyExistsException;
import ru.ivt.subscriptiontracker.app.exception.UserNotFoundException;
import ru.ivt.subscriptiontracker.app.user.entity.User;
import ru.ivt.subscriptiontracker.app.user.repository.UserRepository;

import java.time.Instant;

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

        if (userRepository.existsByEmail(request.email())) {
            throw new UserAlreadyExistsException(
                    "User with this email already exists"
            );
        }

        User user = new User();

        user.setEmail(request.email());
        user.setPasswordHash(
                passwordEncoder.encode(request.password())
        );
        user.setBaseCurrency("RUB");
        user.setStatus("PENDING");
        user.setRegisteredAt(Instant.now());
        user.setUpdatedAt(Instant.now());

        User savedUser = userRepository.save(user);

        return new UserResponse(
                savedUser.getUserId(),
                savedUser.getEmail(),
                savedUser.getBaseCurrency(),
                savedUser.getStatus()
        );
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new InvalidCredentialsException(
                        "Invalid email or password"
                ));

        if (!passwordEncoder.matches(
                request.password(),
                user.getPasswordHash()
        )) {
            throw new InvalidCredentialsException(
                    "Invalid email or password"
            );
        }

        String token = jwtService.generateToken(
                user.getUserId(),
                user.getEmail()
        );

        return new AuthResponse(token);
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String email) {

        User user = userRepository.findByEmail(email)
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
}