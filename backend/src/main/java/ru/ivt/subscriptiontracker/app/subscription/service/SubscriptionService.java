package ru.ivt.subscriptiontracker.app.subscription.service;

import lombok.AllArgsConstructor;
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

import java.util.List;

@Service
@AllArgsConstructor
public class SubscriptionService {
    private final SubscriptionRepository subscriptionRepository;
    private final UserService userService;
    private final CurrentUserService currentUserService;
    private final SubscriptionMapper subscriptionMapper;

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

        subscriptionEntity.setUser(user);

        return subscriptionMapper.toResponse(
                subscriptionRepository.save(subscriptionEntity)
        );
    }

    @Transactional
    public SubscriptionResponse updateMySubscriptions(Long id, SubscriptionRequest subscriptionRequest) {
        SubscriptionEntity subscriptionEntity = requiredOwnSubscription(id);

        subscriptionMapper.updateEntity(subscriptionRequest, subscriptionEntity);

        return subscriptionMapper.toResponse(subscriptionRepository.save(subscriptionEntity));
    }

    @Transactional
    public void deleteMySubscriptions(Long id) {
        SubscriptionEntity subscriptionEntity = requiredOwnSubscription(id);

        subscriptionRepository.delete(subscriptionEntity);
    }

    private SubscriptionEntity requiredOwnSubscription(Long id) {
        User user = userService.findByEmail(currentUserService.getEmail());

        SubscriptionEntity entity = subscriptionRepository.findById(id)
                .orElseThrow(() -> new SubscriptionNotFoundException("Subscription not found"));

        if (!user.getEmail().equals(entity.getUser().getEmail())) {
            throw new SubscriptionNotFoundException("Not your subscription");
        }

        return entity;
    }
}
