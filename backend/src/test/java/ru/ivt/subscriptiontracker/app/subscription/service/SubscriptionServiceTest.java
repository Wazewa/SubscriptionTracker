package ru.ivt.subscriptiontracker.app.subscription.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.ivt.subscriptiontracker.app.security.CurrentUserService;
import ru.ivt.subscriptiontracker.app.subscription.dto.SubscriptionRequest;
import ru.ivt.subscriptiontracker.app.subscription.dto.SubscriptionResponse;
import ru.ivt.subscriptiontracker.app.subscription.entity.Currency;
import ru.ivt.subscriptiontracker.app.subscription.entity.PeriodType;
import ru.ivt.subscriptiontracker.app.subscription.entity.SubscriptionEntity;
import ru.ivt.subscriptiontracker.app.subscription.entity.SubscriptionStatus;
import ru.ivt.subscriptiontracker.app.subscription.exception.SubscriptionNotFoundException;
import ru.ivt.subscriptiontracker.app.subscription.mapper.SubscriptionMapper;
import ru.ivt.subscriptiontracker.app.subscription.repository.SubscriptionRepository;
import ru.ivt.subscriptiontracker.app.user.entity.User;
import ru.ivt.subscriptiontracker.app.user.service.UserService;
import ru.ivt.subscriptiontracker.app.category.entity.CategoryEntity;
import ru.ivt.subscriptiontracker.app.category.repository.CategoryRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SubscriptionService unit tests")
class SubscriptionServiceTest {

    private static final LocalDate FIXED_DATE = LocalDate.of(2030, 1, 1);
    private static final OffsetDateTime FIXED_TS =
            OffsetDateTime.parse("2030-01-01T00:00:00Z");

    @Mock private SubscriptionRepository subscriptionRepository;
    @Mock private UserService userService;
    @Mock private CurrentUserService currentUserService;
    @Mock private SubscriptionMapper subscriptionMapper;
    @Mock private CategoryRepository categoryRepository;

    @InjectMocks private SubscriptionService subscriptionService;

    private User currentUser;
    private User otherUser;
    private SubscriptionEntity ownSubscription;
    private SubscriptionEntity otherSubscription;
    private SubscriptionRequest validRequest;
    private CategoryEntity category;

    @BeforeEach
    void setUp() {
        currentUser = new User();
        currentUser.setUserId(1L);
        currentUser.setEmail("me@example.com");

        otherUser = new User();
        otherUser.setUserId(2L);
        otherUser.setEmail("other@example.com");

        ownSubscription = new SubscriptionEntity();
        ownSubscription.setId(10L);
        ownSubscription.setUser(currentUser);

        otherSubscription = new SubscriptionEntity();
        otherSubscription.setId(20L);
        otherSubscription.setUser(otherUser);

        category = new CategoryEntity();
        category.setId(1L);
        category.setName("Развлечения");

        ownSubscription.setCategory(category);
        otherSubscription.setCategory(category);

        validRequest = new SubscriptionRequest(
                "Netflix",
                new BigDecimal("15.00"),
                Currency.USD,
                FIXED_DATE,
                PeriodType.MONTHLY,
                null,
                1L
        );
    }

    private SubscriptionResponse response(Long id) {
        return new SubscriptionResponse(
                id, "Netflix", new BigDecimal("15.00"), Currency.USD,
                FIXED_DATE, "MONTHLY", null,
                SubscriptionStatus.ACTIVE, FIXED_TS, FIXED_TS, 1L
        );
    }

    @Nested
    @DisplayName("createSubscription")
    class CreateSubscription {

        @Test
        @DisplayName("creates subscription for current user and returns response")
        void createsSubscription() {
            when(currentUserService.getEmail()).thenReturn("me@example.com");
            when(userService.findByEmail("me@example.com")).thenReturn(currentUser);
            when(subscriptionMapper.toEntity(validRequest)).thenReturn(ownSubscription);
            when(subscriptionRepository.save(ownSubscription)).thenReturn(ownSubscription);
            when(subscriptionMapper.toResponse(ownSubscription)).thenReturn(response(10L));
            when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));

            SubscriptionResponse result =
                    subscriptionService.createSubscription(validRequest);

            assertThat(result.id()).isEqualTo(10L);
            assertThat(ownSubscription.getCategory()).isEqualTo(category);
            verify(subscriptionMapper).toEntity(validRequest);
            verify(subscriptionRepository).save(ownSubscription);
        }

        @Test
        @DisplayName("sets current user as owner of new subscription")
        void assignsCurrentUserAsOwner() {
            SubscriptionEntity fresh = new SubscriptionEntity();
            fresh.setId(10L);

            when(currentUserService.getEmail()).thenReturn("me@example.com");
            when(userService.findByEmail("me@example.com")).thenReturn(currentUser);
            when(subscriptionMapper.toEntity(validRequest)).thenReturn(fresh);
            when(subscriptionRepository.save(fresh)).thenReturn(fresh);
            when(subscriptionMapper.toResponse(fresh)).thenReturn(response(10L));
            when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));

            subscriptionService.createSubscription(validRequest);

            assertThat(fresh.getUser()).isEqualTo(currentUser);
            assertThat(fresh.getUser().getUserId()).isEqualTo(1L);
            assertThat(fresh.getCategory()).isEqualTo(category);

            ArgumentCaptor<SubscriptionEntity> captor =
                    ArgumentCaptor.forClass(SubscriptionEntity.class);
            verify(subscriptionRepository).save(captor.capture());
            assertThat(captor.getValue().getUser()).isEqualTo(currentUser);
        }

        @Test
        @DisplayName("throws when current user not found")
        void throwsWhenCurrentUserNotFound() {
            when(currentUserService.getEmail()).thenReturn("ghost@example.com");
            when(userService.findByEmail("ghost@example.com"))
                    .thenThrow(new RuntimeException("User not found"));

            assertThatThrownBy(() ->
                    subscriptionService.createSubscription(validRequest))
                    .isInstanceOf(RuntimeException.class);

            verify(subscriptionRepository, never()).save(any(SubscriptionEntity.class));
            verify(subscriptionMapper, never()).toEntity(any(SubscriptionRequest.class));
        }
    }

    @Nested
    @DisplayName("findMySubscriptions")
    class FindMySubscriptions {

        @Test
        @DisplayName("returns only subscriptions of current user")
        void returnsOnlyOwnSubscriptions() {
            when(currentUserService.getEmail()).thenReturn("me@example.com");
            when(userService.findByEmail("me@example.com")).thenReturn(currentUser);
            when(subscriptionRepository.findAllByUser(currentUser))
                    .thenReturn(List.of(ownSubscription));

            SubscriptionResponse resp = response(10L);
            when(subscriptionMapper.toResponse(ownSubscription)).thenReturn(resp);

            List<SubscriptionResponse> result =
                    subscriptionService.findMySubscriptions();

            assertThat(result).containsExactly(resp);
            verify(subscriptionRepository).findAllByUser(currentUser);
            verify(subscriptionMapper).toResponse(ownSubscription);
        }

        @Test
        @DisplayName("returns empty list when user has no subscriptions")
        void returnsEmptyList() {
            when(currentUserService.getEmail()).thenReturn("me@example.com");
            when(userService.findByEmail("me@example.com")).thenReturn(currentUser);
            when(subscriptionRepository.findAllByUser(currentUser)).thenReturn(List.of());

            List<SubscriptionResponse> result =
                    subscriptionService.findMySubscriptions();

            assertThat(result).isEmpty();
            verify(subscriptionMapper, never()).toResponse(any());
        }
    }

    @Nested
    @DisplayName("updateMySubscriptions")
    class UpdateMySubscriptions {

        @Test
        @DisplayName("updates own subscription successfully")
        void updatesOwnSubscription() {
            when(currentUserService.getEmail()).thenReturn("me@example.com");
            when(userService.findByEmail("me@example.com")).thenReturn(currentUser);
            when(subscriptionRepository.findById(10L))
                    .thenReturn(Optional.of(ownSubscription));
            when(subscriptionRepository.save(ownSubscription))
                    .thenReturn(ownSubscription);
            when(categoryRepository.findById(1L))
                    .thenReturn(Optional.of(category));

            SubscriptionResponse resp = response(10L);
            when(subscriptionMapper.toResponse(ownSubscription)).thenReturn(resp);

            SubscriptionResponse result =
                    subscriptionService.updateMySubscriptions(10L, validRequest);

            assertThat(result).isEqualTo(resp);
            assertThat(ownSubscription.getCategory()).isEqualTo(category);
            verify(subscriptionMapper).updateEntity(validRequest, ownSubscription);
            verify(subscriptionRepository).save(ownSubscription);
        }

        @Test
        @DisplayName("throws SubscriptionNotFoundException when subscription does not exist")
        void throwsWhenNotFound() {
            when(currentUserService.getEmail()).thenReturn("me@example.com");
            when(userService.findByEmail("me@example.com")).thenReturn(currentUser);
            when(subscriptionRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() ->
                    subscriptionService.updateMySubscriptions(99L, validRequest))
                    .isInstanceOf(SubscriptionNotFoundException.class);

            verify(subscriptionMapper, never()).updateEntity(any(), any());
            verify(subscriptionRepository, never()).save(any());
        }

        @Test
        @DisplayName("throws SubscriptionNotFoundException when subscription belongs to another user")
        void throwsWhenNotOwn() {
            when(currentUserService.getEmail()).thenReturn("me@example.com");
            when(userService.findByEmail("me@example.com")).thenReturn(currentUser);
            when(subscriptionRepository.findById(20L))
                    .thenReturn(Optional.of(otherSubscription));

            assertThatThrownBy(() ->
                    subscriptionService.updateMySubscriptions(20L, validRequest))
                    .isInstanceOf(SubscriptionNotFoundException.class);

            verify(subscriptionMapper, never()).updateEntity(any(), any());
            verify(subscriptionRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("deleteMySubscriptions")
    class DeleteMySubscriptions {

        @Test
        @DisplayName("deletes own subscription successfully")
        void deletesOwnSubscription() {
            when(currentUserService.getEmail()).thenReturn("me@example.com");
            when(userService.findByEmail("me@example.com")).thenReturn(currentUser);
            when(subscriptionRepository.findById(10L))
                    .thenReturn(Optional.of(ownSubscription));

            subscriptionService.deleteMySubscriptions(10L);

            verify(subscriptionRepository).delete(ownSubscription);
        }

        @Test
        @DisplayName("throws SubscriptionNotFoundException when subscription does not exist")
        void throwsWhenNotFound() {
            when(currentUserService.getEmail()).thenReturn("me@example.com");
            when(userService.findByEmail("me@example.com")).thenReturn(currentUser);
            when(subscriptionRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> subscriptionService.deleteMySubscriptions(99L))
                    .isInstanceOf(SubscriptionNotFoundException.class);

            verify(subscriptionRepository, never()).delete(any(SubscriptionEntity.class));
        }

        @Test
        @DisplayName("throws SubscriptionNotFoundException when subscription belongs to another user")
        void throwsWhenNotOwn() {
            when(currentUserService.getEmail()).thenReturn("me@example.com");
            when(userService.findByEmail("me@example.com")).thenReturn(currentUser);
            when(subscriptionRepository.findById(20L))
                    .thenReturn(Optional.of(otherSubscription));

            assertThatThrownBy(() -> subscriptionService.deleteMySubscriptions(20L))
                    .isInstanceOf(SubscriptionNotFoundException.class);

            verify(subscriptionRepository, never()).delete(any(SubscriptionEntity.class));
        }
    }
}