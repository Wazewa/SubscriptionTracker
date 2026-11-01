package ru.ivt.subscriptiontracker.app.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.ivt.subscriptiontracker.app.user.entity.UserIdentity;

import java.util.Optional;

public interface UserIdentityRepository extends JpaRepository<UserIdentity, Long> {

    Optional<UserIdentity> findByProviderAndProviderUserId(String provider, String providerUserId);
}