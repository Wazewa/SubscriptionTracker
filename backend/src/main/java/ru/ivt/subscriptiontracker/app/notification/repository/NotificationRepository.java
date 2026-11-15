package ru.ivt.subscriptiontracker.app.notification.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.ivt.subscriptiontracker.app.notification.entity.NotificationEntity;

import java.time.OffsetDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {

    List<NotificationEntity> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    boolean existsBySubscriptionIdAndCreatedAtAfter(
            Long subscriptionId,
            OffsetDateTime after
    );
}