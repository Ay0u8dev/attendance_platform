package ma.eniad.userservice.service;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.FindOrCreateUserRequest;
import ma.eniad.userservice.dto.UserResponseDto;
import ma.eniad.userservice.entity.User;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public UserResponseDto findOrCreateUser(FindOrCreateUserRequest request) {
        return userRepository.findByEmail(request.getEmail())
                .map(this::toResponse)
                .orElseGet(() -> createOrLoadOnConflict(request));
    }

    private UserResponseDto createOrLoadOnConflict(FindOrCreateUserRequest request) {
        User newUser = User.builder()
                .email(request.getEmail())
                .username(request.getUsername())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .pictureUrl(request.getPictureUrl())
                .role(Role.USER)
                .enabled(true)
                .build();

        try {
            return toResponse(userRepository.save(newUser));
        } catch (DataIntegrityViolationException ex) {
            return userRepository.findByEmail(request.getEmail())
                    .map(this::toResponse)
                    .orElseThrow(() -> ex);
        }
    }

    private UserResponseDto toResponse(User user) {
        return UserResponseDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .pictureUrl(user.getPictureUrl())
                .roles(user.getRole() == null ? List.of() : List.of(user.getRole().name()))
                .enabled(user.isEnabled())
                .build();
    }
}
