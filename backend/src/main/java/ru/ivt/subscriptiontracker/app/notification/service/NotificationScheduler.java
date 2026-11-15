package ru.ivt.subscriptiontracker.app.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import ru.ivt.subscriptiontracker.app.notification.entity.NotificationEntity;
import ru.ivt.subscriptiontracker.app.notification.repository.NotificationRepository;
import ru.ivt.subscriptiontracker.app.subscription.entity.SubscriptionEntity;
import ru.ivt.subscriptiontracker.app.subscription.entity.SubscriptionStatus;
import ru.ivt.subscriptiontracker.app.subscription.repository.SubscriptionRepository;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

@Slf4j
@Component
@EnableScheduling
@RequiredArgsConstructor
public class NotificationScheduler {

    private static final int LEAD_DAYS = 3;

    private final SubscriptionRepository subscriptionRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final TelegramClient telegramClient;

    @Scheduled(cron = "${notifications.cron:0 0 9 * * *}")
    public void createUpcomingNotifications() {
        LocalDate today = LocalDate.now();
        LocalDate until = today.plusDays(LEAD_DAYS);

        List<SubscriptionEntity> due = subscriptionRepository.findDueBetween(
                SubscriptionStatus.ACTIVE.name(), today, until);

        for (SubscriptionEntity s : due) {
            boolean alreadyNotified = notificationRepository
                    .existsBySubscriptionIdAndCreatedAtAfter(
                            s.getId(),
                            today.atStartOfDay().atOffset(ZoneOffset.UTC));

            if (alreadyNotified) continue;

            String message = "Скоро списание: «%s» на %s %s (%s)".formatted(
                    s.getName(), s.getAmount().toPlainString(), s.getCurrency(), s.getNextPaymentDate()
            );

            try {
                NotificationEntity notification = notificationService.createPendingNotification(s.getUser(), s.getId(), message);
                boolean sent = telegramClient.send(s.getUser().getTelegramChatId(), message);
                notificationService.updateNotificationStatus(notification.getId(), sent);
            } catch (DataIntegrityViolationException e) {
                log.debug("Notification already exists for subscription id={}", s.getId());
            }
        }
    }
}