package ru.ivt.subscriptiontracker.app.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.Map;

@Slf4j
@Component
public class TelegramClient {

    private final RestClient restClient;
    private final String botToken;

    public TelegramClient(
            @Value("${telegram.api-url:https://api.telegram.org}") String apiUrl,
            @Value("${telegram.bot-token:}") String botToken
    ) {
        this.restClient = RestClient.builder().baseUrl(apiUrl).build();
        this.botToken = botToken;
    }

    public boolean send(String chatId, String text) {
        if (botToken == null || botToken.isBlank()
                || chatId == null || chatId.isBlank()) {
            log.debug("Telegram не настроен (token/chatId пустые)");
            return false;
        }
        try {
            restClient.post()
                    .uri("/bot{token}/sendMessage", botToken)
                    .body(Map.of("chat_id", chatId, "text", text))
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (RestClientResponseException e) {
            log.error("Telegram API error for chatId={}. Status: {}", chatId, e.getStatusCode().value());
            return false;
        } catch (Exception e) {
            log.error("Failed to connect to Telegram for chatId={}. Error type: {}", chatId, e.getClass().getSimpleName());
            return false;
        }
    }
}