package ru.ivt.subscriptiontracker.app.subscription.controller;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.ivt.subscriptiontracker.app.subscription.dto.SubscriptionRequest;
import ru.ivt.subscriptiontracker.app.subscription.dto.SubscriptionResponse;
import ru.ivt.subscriptiontracker.app.subscription.service.SubscriptionService;

import java.util.List;

@RestController
@AllArgsConstructor
@RequestMapping("/api/subscriptions")
public class SubscriptionController {
    private final SubscriptionService subscriptionService;

    @GetMapping("/me")
    public ResponseEntity<List<SubscriptionResponse>> getMySubscriptions() {
        return ResponseEntity.ok(subscriptionService.findMySubscriptions());
    }

    @PostMapping
    public ResponseEntity<SubscriptionResponse> createSubscription(
            @Valid @RequestBody SubscriptionRequest subscriptionRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(subscriptionService.createSubscription(subscriptionRequest));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SubscriptionResponse> updateMySubscriptions(@PathVariable Long id,
                                                 @Valid @RequestBody SubscriptionRequest subscriptionRequest) {
        return ResponseEntity.ok(subscriptionService.updateMySubscriptions(id, subscriptionRequest));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMySubscriptions(@PathVariable Long id) {
        subscriptionService.deleteMySubscriptions(id);
        return ResponseEntity.noContent().build();
    }
}