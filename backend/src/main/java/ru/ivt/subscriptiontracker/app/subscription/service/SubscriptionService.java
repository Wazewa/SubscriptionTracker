package ru.ivt.subscriptiontracker.app.subscription.service;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.ivt.subscriptiontracker.app.security.CurrentUserService;
import ru.ivt.subscriptiontracker.app.subscription.dto.SubscriptionRequest;
import ru.ivt.subscriptiontracker.app.subscription.dto.SubscriptionResponse;
import ru.ivt.subscriptiontracker.app.subscription.entity.SubscriptionEntity;
import ru.ivt.subscriptiontracker.app.subscription.exception.SubscriptionNotFoundException;
import ru.ivt.subscriptiontracker.app.subscription.mapper.SubscriptionMapper;
import ru.ivt.subscriptiontracker.app.subscription.repository.SubscriptionRepository;
import ru.ivt.subscriptiontracker.app.user.entity.User;
import ru.ivt.subscriptiontracker.app.user.service.UserService;
import ru.ivt.subscriptiontracker.app.category.entity.CategoryEntity;
import ru.ivt.subscriptiontracker.app.category.exception.CategoryNotFoundException;
import ru.ivt.subscriptiontracker.app.category.repository.CategoryRepository;

import java.util.List;

@Slf4j
@Service
@AllArgsConstructor
public class SubscriptionService {
    private final SubscriptionRepository subscriptionRepository;
    private final UserService userService;
    private final CurrentUserService currentUserService;
    private final SubscriptionMapper subscriptionMapper;
    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public List<SubscriptionResponse> findMySubscriptions() {
        User user = userService.findByEmail(currentUserService.getEmail());

        return subscriptionRepository.findAllByUser(user).stream()
                .map(subscriptionMapper::toResponse)
                .toList();
    }

    @Transactional
    public SubscriptionResponse createSubscription(SubscriptionRequest subscriptionRequest) {
        User user = userService.findByEmail(currentUserService.getEmail());

        SubscriptionEntity subscriptionEntity =
                subscriptionMapper.toEntity(subscriptionRequest);

        CategoryEntity category = findCategoryById(subscriptionRequest.categoryId());
        subscriptionEntity.setCategory(category);
        subscriptionEntity.setStatus("ACTIVE");
        subscriptionEntity.setUser(user);

        SubscriptionEntity saved = subscriptionRepository.save(subscriptionEntity);

        log.info("Created subscription id={} for user id={}", saved.getId(), user.getUserId());

        return subscriptionMapper.toResponse(
                saved
        );
    }


    @Transactional
    public SubscriptionResponse updateMySubscriptions(
            Long id,
            SubscriptionRequest subscriptionRequest
    ) {
        SubscriptionEntity subscriptionEntity = requiredOwnSubscription(id);

        CategoryEntity category = findCategoryById(subscriptionRequest.categoryId());

        subscriptionMapper.updateEntity(subscriptionRequest, subscriptionEntity);
        subscriptionEntity.setCategory(category);

        SubscriptionEntity saved = subscriptionRepository.save(subscriptionEntity);

        log.info("Updated subscription id={} for user id={}", saved.getId(), saved.getUser().getUserId());

        return subscriptionMapper.toResponse(
                saved
        );
    }


    @Transactional
    public void deleteMySubscriptions(Long id) {
        SubscriptionEntity subscriptionEntity = requiredOwnSubscription(id);
        subscriptionRepository.delete(subscriptionEntity);

        log.info("Deleted subscription id={} for user id={}", id, subscriptionEntity.getUser().getUserId());
    }

    private CategoryEntity findCategoryById(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> {
                    log.warn("Category with id={} not found", categoryId);
                    return new CategoryNotFoundException(categoryId);
                });
    }

    private SubscriptionEntity requiredOwnSubscription(Long id) {
        User user = userService.findByEmail(currentUserService.getEmail());

        SubscriptionEntity entity = subscriptionRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Subscription id={} not found for user id={}", id, user.getUserId());
                    return new SubscriptionNotFoundException("Subscription not found");
                });


        if (!user.getEmail().equals(entity.getUser().getEmail())) {
            log.warn("Security alert: User id={} tried to access subscription id={} owned by user id={}",
                    user.getUserId(), id, entity.getUser().getUserId());
            throw new SubscriptionNotFoundException("Not your subscription");
        }

        return entity;
    }
}
