package ru.ivt.subscriptiontracker.app.security;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {
    public String getEmail() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}