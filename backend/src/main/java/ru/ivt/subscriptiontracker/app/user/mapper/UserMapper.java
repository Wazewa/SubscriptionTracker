package ru.ivt.subscriptiontracker.app.user.mapper;

import org.mapstruct.Mapper;
import ru.ivt.subscriptiontracker.app.user.dto.UserResponse;
import ru.ivt.subscriptiontracker.app.user.entity.User;

@Mapper(componentModel = "spring")
public interface UserMapper {
    UserResponse toResponse(User user);
}
