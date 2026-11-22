package ru.ivt.subscriptiontracker.app.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_MS = 60_000;
    private static final Set<String> AUTH_PATHS =
            Set.of("/api/auth/login", "/api/auth/register", "/api/auth/vk");

    private final int authLimit;
    private final int apiLimit;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public RateLimitFilter(
            @Value("${rate-limit.auth-per-minute:10}") int authLimit,
            @Value("${rate-limit.api-per-minute:120}") int apiLimit
    ) {
        this.authLimit = authLimit;
        this.apiLimit = apiLimit;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        if ("OPTIONS".equals(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        boolean auth = AUTH_PATHS.contains(request.getRequestURI());
        int limit = auth ? authLimit : apiLimit;
        String key = (auth ? "auth:" : "api:") + request.getRemoteAddr();
        long now = System.currentTimeMillis();

        if (windows.size() > 10_000) {
            windows.values().removeIf(w -> now - w.start >= WINDOW_MS);
        }

        Window window = windows.compute(key, (k, old) -> {
            if (old == null || now - old.start >= WINDOW_MS) {
                return new Window(now);
            }
            old.count.incrementAndGet();
            return old;
        });

        if (window.count.get() > limit) {
            long retryAfter = Math.max(1, (WINDOW_MS - (now - window.start)) / 1000);
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(retryAfter));
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("""
                    {"timestamp": "%s", "status": 429, "message": "Too many requests"}"""
                    .formatted(Instant.now()));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private static final class Window {
        final long start;
        final AtomicInteger count = new AtomicInteger(1);

        Window(long start) {
            this.start = start;
        }
    }
}