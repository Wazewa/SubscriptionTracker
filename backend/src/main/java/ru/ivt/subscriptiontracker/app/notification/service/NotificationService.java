package ru.ivt.subscriptiontracker.app.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
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
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_SENT = "SENT";
    private static final String STATUS_FAILED = "FAILED";

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final TelegramClient telegramClient;

    @Transactional(readOnly = true)
    public List<NotificationResponse> myNotifications() {
        User user = getCurrentUser();
        return notificationRepository
                .findAllByUserIdOrderByCreatedAtDesc(user.getUserId())
                .stream()
                .map(NotificationResponse::from)
                .toList();
    }

    public void sendToTelegram(String message) {
        User user = getCurrentUser();
        telegramClient.send(user.getTelegramChatId(), message);
    }

    @Transactional
    public void updateTelegramChatId(String chatId) {
        User user = getCurrentUser();
        user.setTelegramChatId(chatId);
        userRepository.save(user);
        log.info("Telegram chatId обновлён для user={}", user.getEmail());
    }

    @Transactional
    public NotificationEntity createPendingNotification(User user, Long subscriptionId, String message) {
        NotificationEntity n = new NotificationEntity();
        n.setUserId(user.getUserId());
        n.setSubscriptionId(subscriptionId);
        n.setMessage(message);
        n.setType(TYPE_PAYMENT_REMINDER);
        n.setScheduledAt(OffsetDateTime.now());
        n.setStatus(STATUS_PENDING);
        n.setSentToTelegram(false);
        return notificationRepository.save(n);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateNotificationStatus(Long notificationId, boolean sent) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setStatus(sent ? STATUS_SENT : STATUS_FAILED);
            n.setSentToTelegram(sent);
            if (sent) {
                n.setSentAt(OffsetDateTime.now());
            } else {
                n.setErrorMessage("Telegram delivery failed");
            }
            notificationRepository.save(n);
        });
    }

    private User getCurrentUser() {
        String email = currentUserService.getEmail();
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalStateException("User not found: " + email));
    }
}