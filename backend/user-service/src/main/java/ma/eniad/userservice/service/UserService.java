package ma.eniad.userservice.service;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.FindOrCreateUserRequest;
import ma.eniad.userservice.dto.UserResponseDto;
import ma.eniad.userservice.entity.User;
import ma.eniad.userservice.entity.UserDetails;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.repository.UserDetailsRepository;
import ma.eniad.userservice.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserDetailsRepository userDetailsRepository;

    public UserResponseDto findOrCreateUser(FindOrCreateUserRequest request) {
        User user;

        if (userRepository.existsByEmail(request.getEmail())) {
            user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> new RuntimeException("User not found after existence check"));
        } else {
            user = CreateUser(Map.of(
                    "email", request.getEmail(),
                    "username", request.getUsername(),
                    "firstName", request.getFirstName(),
                    "lastName", request.getLastName(),
                    "pictureUrl", request.getPictureUrl()
            ));
        }

        return UserResponseDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .roles(user.getRoles().stream().map(Enum::name).toList())
                .enabled(user.isEnabled())
                .build();
    }

    public User CreateUser(Map<String, ?> user) {
        UserDetails userDetails = UserDetails.builder()
                .firstName((String) user.get("firstName"))
                .lastName((String) user.get("lastName"))
                .pictureUrl((String) user.get("pictureUrl"))
                .build();
        userDetails = userDetailsRepository.save(userDetails);

        User newUser = User.builder()
                .email((String) user.get("email"))
                .username((String) user.get("username"))
                .roles(List.of(Role.USER)) // Default role
                .userDetails(userDetails)
                .enabled(true) // Enable the user by default
                .build();

        try {
            return userRepository.save(newUser);
        } catch (DataIntegrityViolationException e) {
            throw new RuntimeException("A user with this email already exists.");
        }
    }
}
