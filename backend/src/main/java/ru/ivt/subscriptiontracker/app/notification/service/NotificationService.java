package ru.ivt.subscriptiontracker.app.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.ivt.subscriptiontracker.app.notification.dto.NotificationResponse;
import ru.ivt.subscriptiontracker.app.notification.entity.NotificationEntity;
import ru.ivt.subscriptiontracker.app.notification.repository.NotificationRepository;
import ru.ivt.subscriptiontracker.app.security.CurrentUserService;
import ru.ivt.subscriptiontracker.app.user.entity.User;
import ru.ivt.subscriptiontracker.app.user.repository.UserRepository;

import java.time.OffsetDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final String TYPE_PAYMENT_REMINDER = "PAYMENT_REMINDER";
    private static final String STATUS_SENT = "SENT";
    private static final String STATUS_FAILED = "FAILED";

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final TelegramClient telegramClient;

    @Transactional(readOnly = true)
    public List<NotificationResponse> myNotifications() {
        User user = currentUser();
        return notificationRepository
                .findAllByUserIdOrderByCreatedAtDesc(user.getUserId())
                .stream()
                .map(NotificationResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public void sendToTelegram(String message) {
        User user = currentUser();
        telegramClient.send(user.getTelegramChatId(), message);
    }

    @Transactional
    public void updateTelegramChatId(String chatId) {
        User user = currentUser();
        user.setTelegramChatId(chatId);
        userRepository.save(user);
        log.info("Telegram chatId обновлён для user={}", user.getEmail());
    }

    @Transactional
    public NotificationEntity createAndSend(User user, Long subscriptionId, String message) {
        OffsetDateTime now = OffsetDateTime.now();
        boolean sent = telegramClient.send(user.getTelegramChatId(), message);

        NotificationEntity n = new NotificationEntity();
        n.setUserId(user.getUserId());
        n.setSubscriptionId(subscriptionId);
        n.setMessage(message);
        n.setType(TYPE_PAYMENT_REMINDER);
        n.setScheduledAt(now);
        n.setSentToTelegram(sent);
        n.setStatus(sent ? STATUS_SENT : STATUS_FAILED);
        if (sent) {
            n.setSentAt(now);
        } else {
            n.setErrorMessage("Telegram delivery failed or not configured");
        }
        return notificationRepository.save(n);
    }

    private User currentUser() {
        String email = currentUserService.getEmail();
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalStateException(
                        "Authenticated user not found: " + email));
    }
}