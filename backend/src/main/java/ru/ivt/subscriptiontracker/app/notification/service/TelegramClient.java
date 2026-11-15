package ru.ivt.subscriptiontracker.app.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Slf4j
@Component
public class TelegramClient {

    private final RestClient restClient = RestClient.create();

    @Value("${telegram.bot-token:}")
    private String botToken;

    public boolean send(String chatId, String text) {
        if (botToken == null || botToken.isBlank()
                || chatId == null || chatId.isBlank()) {
            log.debug("Telegram не настроен (token/chatId пустые)");
            return false;
        }
        try {
            restClient.post()
                    .uri("https://api.telegram.org/bot{token}/sendMessage", botToken)
                    .body(Map.of("chat_id", chatId, "text", text))
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (Exception e) {
            log.error("Не удалось отправить в Telegram chatId={}: {}", chatId, e.getMessage());
            return false;
        }
    }
}