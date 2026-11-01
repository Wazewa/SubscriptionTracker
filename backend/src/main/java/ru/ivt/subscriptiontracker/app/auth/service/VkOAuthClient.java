package ru.ivt.subscriptiontracker.app.auth.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import ru.ivt.subscriptiontracker.app.auth.dto.VkAuthRequest;
import ru.ivt.subscriptiontracker.app.auth.exception.InvalidCredentialsException;

import java.net.http.HttpClient;
import java.time.Duration;

@Component
public class VkOAuthClient {

    private static final Logger log = LoggerFactory.getLogger(VkOAuthClient.class);

    private final RestClient restClient;
    private final String clientId;
    private final String redirectUri;
    private final String tokenUrl;
    private final String userInfoUrl;

    public VkOAuthClient(
            @Value("${vk.client-id:}") String clientId,
            @Value("${vk.redirect-uri:}") String redirectUri,
            @Value("${vk.token-url:https://id.vk.ru/oauth2/auth}") String tokenUrl,
            @Value("${vk.user-info-url:https://id.vk.ru/oauth2/user_info}") String userInfoUrl
    ) {
        this.clientId = clientId;
        this.redirectUri = redirectUri;
        this.tokenUrl = tokenUrl;
        this.userInfoUrl = userInfoUrl;

        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()
        );
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    public VkProfile fetchProfile(VkAuthRequest request) {
        if (clientId.isBlank() || redirectUri.isBlank()) {
            throw new IllegalStateException("VK ID is not configured: set VK_CLIENT_ID and VK_REDIRECT_URI");
        }

        TokenResponse token = exchangeCode(request);
        if (token == null || token.accessToken() == null || token.userId() == null) {
            log.warn("VK ID code exchange returned an empty or incomplete response (response present: {})",
                    token != null);
            throw new InvalidCredentialsException("VK authorization failed");
        }

        return new VkProfile(token.userId(), fetchEmail(token.accessToken()));
    }

    private TokenResponse exchangeCode(VkAuthRequest request) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("code", request.code());
        form.add("code_verifier", request.codeVerifier());
        form.add("device_id", request.deviceId());
        form.add("state", request.state());
        form.add("client_id", clientId);
        form.add("redirect_uri", redirectUri);

        try {
            return restClient.post()
                    .uri(tokenUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(TokenResponse.class);
        } catch (RestClientResponseException e) {
            log.warn("VK ID code exchange failed: status={}, body={}",
                    e.getStatusCode().value(), e.getResponseBodyAsString());
            throw new InvalidCredentialsException("VK authorization failed");
        } catch (RestClientException e) {
            log.warn("VK ID code exchange failed: {}", e.getMessage());
            throw new InvalidCredentialsException("VK authorization failed");
        }
    }

    private String fetchEmail(String accessToken) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", clientId);
        form.add("access_token", accessToken);

        try {
            UserInfoResponse info = restClient.post()
                    .uri(userInfoUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(UserInfoResponse.class);
            if (info == null || info.user() == null) {
                return null;
            }
            String email = info.user().email();
            return (email == null || email.isBlank()) ? null : email;
        } catch (RestClientResponseException e) {
            log.warn("VK ID user_info failed: status={}, body={}",
                    e.getStatusCode().value(), e.getResponseBodyAsString());
            return null;
        } catch (RestClientException e) {
            log.warn("VK ID user_info failed: {}", e.getMessage());
            return null;
        }
    }

    public record VkProfile(String userId, String email) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record TokenResponse(
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("user_id") String userId
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record UserInfoResponse(@JsonProperty("user") UserInfo user) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record UserInfo(@JsonProperty("email") String email) {
    }
}