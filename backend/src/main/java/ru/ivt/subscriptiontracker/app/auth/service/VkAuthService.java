package ru.ivt.subscriptiontracker.app.auth.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.ivt.subscriptiontracker.app.auth.dto.AuthResponse;
import ru.ivt.subscriptiontracker.app.auth.dto.VkAuthRequest;
import ru.ivt.subscriptiontracker.app.user.entity.User;
import ru.ivt.subscriptiontracker.app.user.entity.UserIdentity;
import ru.ivt.subscriptiontracker.app.user.exception.UserAlreadyExistsException;
import ru.ivt.subscriptiontracker.app.user.repository.UserIdentityRepository;
import ru.ivt.subscriptiontracker.app.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import java.util.Locale;
import java.util.UUID;


@Slf4j
@Service
public class VkAuthService {

    static final String PROVIDER = "VK";

    private final VkOAuthClient vkOAuthClient;
    private final UserRepository userRepository;
    private final UserIdentityRepository userIdentityRepository;
    private final JwtService jwtService;

    public VkAuthService(
            VkOAuthClient vkOAuthClient,
            UserRepository userRepository,
            UserIdentityRepository userIdentityRepository,
            JwtService jwtService
    ) {
        this.vkOAuthClient = vkOAuthClient;
        this.userRepository = userRepository;
        this.userIdentityRepository = userIdentityRepository;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse login(VkAuthRequest request) {
        VkOAuthClient.VkProfile profile = vkOAuthClient.fetchProfile(request);

        User user = userIdentityRepository
                .findByProviderAndProviderUserId(PROVIDER, profile.userId())
                .map(UserIdentity::getUser)
                .orElseGet(() -> createUser(profile));

        String token = jwtService.generateToken(
                user.getUserId(),
                user.getEmail(),
                user.getTokenVersion()
        );

        return new AuthResponse(token);
    }

    private User createUser(VkOAuthClient.VkProfile profile) {
        User user = new User();
        user.setEmail(resolveEmail(profile));
        user.setBaseCurrency("RUB");
        user.setStatus("PENDING");

        User savedUser = userRepository.save(user);

        UserIdentity identity = new UserIdentity();
        identity.setUser(savedUser);
        identity.setProvider(PROVIDER);
        identity.setProviderUserId(profile.userId());
        userIdentityRepository.save(identity);
        log.info("Created user via VK ID: userId={}, provider={}", savedUser.getUserId(), PROVIDER);
        return savedUser;
    }


    private String resolveEmail(VkOAuthClient.VkProfile profile) {
        String vkEmail = profile.email();
        if (vkEmail != null) {
            String normalized = vkEmail.trim().toLowerCase(Locale.ROOT);
            if (!normalized.isEmpty()) {
                if (userRepository.existsByEmailIgnoreCase(normalized)) {
                    throw new UserAlreadyExistsException("User with this email already exists");
                }
                return normalized;
            }
        }
        String synthetic = "vk_" + profile.userId() + "@vk.local";
        return userRepository.existsByEmailIgnoreCase(synthetic)
                ? "vk_" + profile.userId() + "_" + UUID.randomUUID() + "@vk.local"
                : synthetic;
    }
}
