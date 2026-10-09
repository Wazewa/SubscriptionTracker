package ru.ivt.subscriptiontracker;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(classes = ru.ivt.subscriptiontracker.app.SubscriptionTrackerApplication.class)
@ActiveProfiles("local")
class SubscriptionTrackerApplicationTests {

    @Test
    void contextLoads() {
    }

}
