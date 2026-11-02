
package ru.ivt.subscriptiontracker.app.dashboard.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.repository.Repository;
import ru.ivt.subscriptiontracker.app.subscription.entity.SubscriptionEntity;

import java.util.List;

public interface DashboardRepository extends Repository<SubscriptionEntity, Long> {

    @EntityGraph(attributePaths = {"category"})
    List<SubscriptionEntity> findAllByUser_EmailAndStatusOrderByNextPaymentDateAsc(
            String email,
            String status
    );
}
