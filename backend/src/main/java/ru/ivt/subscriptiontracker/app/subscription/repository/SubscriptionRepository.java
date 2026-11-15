package ru.ivt.subscriptiontracker.app.subscription.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ru.ivt.subscriptiontracker.app.subscription.entity.SubscriptionEntity;
import ru.ivt.subscriptiontracker.app.user.entity.User;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

@Repository
public interface SubscriptionRepository extends JpaRepository<SubscriptionEntity, Long> {
    List<SubscriptionEntity> findAllByUser(User user);

    @EntityGraph(attributePaths = {"user"})
    @Query("""
            select s from SubscriptionEntity s
            where s.status = :status
              and s.nextPaymentDate between :from and :to
            """)
    List<SubscriptionEntity> findDueBetween(
            @Param("status") String status,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );
}
