package ru.ivt.subscriptiontracker.app.user.service;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.ivt.subscriptiontracker.app.user.entity.User;
import ru.ivt.subscriptiontracker.app.user.exception.UserNotFoundException;
import ru.ivt.subscriptiontracker.app.user.mapper.UserMapper;
import ru.ivt.subscriptiontracker.app.user.repository.UserRepository;

@Service
@AllArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @Transactional(readOnly = true)
    public User findByEmail(String email) {
        return (userRepository.findByEmailIgnoreCase(email).orElseThrow(
                () -> new UserNotFoundException("User with email " + email + "not found")
        ));
    }
}
