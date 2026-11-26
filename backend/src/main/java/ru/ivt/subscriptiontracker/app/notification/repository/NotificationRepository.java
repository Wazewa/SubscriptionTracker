package ru.ivt.subscriptiontracker.app.notification.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import ru.ivt.subscriptiontracker.app.notification.entity.NotificationEntity;

import java.time.OffsetDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {

    List<NotificationEntity> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    @Modifying
    @Query("update NotificationEntity n set n.read = :read where n.id = :id and n.userId = :userId")
    int updateReadStatus(Long id, Long userId, boolean read);


    boolean existsBySubscriptionIdAndCreatedAtAfter(
            Long subscriptionId,
            OffsetDateTime after
    );
}
