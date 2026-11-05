
package ru.ivt.subscriptiontracker.app.dashboard.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import ru.ivt.subscriptiontracker.app.dashboard.dto.DashboardUpcomingResponse;
import ru.ivt.subscriptiontracker.app.subscription.entity.SubscriptionEntity;

@Mapper(componentModel = "spring")
public interface DashboardMapper {

    @Mapping(target = "subscriptionId", source = "id")
    @Mapping(target = "subscriptionName", source = "name")
    @Mapping(target = "categoryName", source = "category.name")
    @Mapping(target = "paymentDate", source = "nextPaymentDate")
    DashboardUpcomingResponse.UpcomingPayment toUpcomingPayment(
            SubscriptionEntity subscription
    );
}
