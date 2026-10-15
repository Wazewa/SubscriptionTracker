package ru.ivt.subscriptiontracker.app.subscription.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ru.ivt.subscriptiontracker.app.subscription.entity.SubscriptionEntity;
import ru.ivt.subscriptiontracker.app.user.entity.User;

import java.util.Collection;
import java.util.List;

@Repository
public interface SubscriptionRepository extends JpaRepository<SubscriptionEntity, Long> {
    List<SubscriptionEntity> findAllByUser(User user);
}
