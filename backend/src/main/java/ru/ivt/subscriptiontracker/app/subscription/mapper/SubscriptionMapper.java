package ru.ivt.subscriptiontracker.app.subscription.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import ru.ivt.subscriptiontracker.app.subscription.dto.SubscriptionRequest;
import ru.ivt.subscriptiontracker.app.subscription.dto.SubscriptionResponse;
import ru.ivt.subscriptiontracker.app.subscription.entity.SubscriptionEntity;


@Mapper(componentModel = "spring")
public interface SubscriptionMapper {
    //@Mapping(target = "categoryId", source = "category.id") // раскомментировать, когда категории будут
    SubscriptionResponse toResponse(SubscriptionEntity subscriptionEntity);

    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "id", ignore = true)
    SubscriptionEntity toEntity(SubscriptionRequest subscriptionRequest);

    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "id", ignore = true)
    void updateEntity(SubscriptionRequest subscriptionRequest,
                      @MappingTarget SubscriptionEntity subscriptionEntity);
}
