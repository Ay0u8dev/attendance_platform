package ma.eniad.userservice.service;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.AuthUserRequest;
import ma.eniad.userservice.dto.UserResponseDto;
import ma.eniad.userservice.entity.User;
import ma.eniad.userservice.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public User findUser(AuthUserRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.isFirstLogin()) {
            user.setFirstLogin(false);
            user.setPfpUrl(request.getPfpUrl());
            user = userRepository.save(user);
        }
        
        return user;
    }


    public UserResponseDto findById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));

        return UserResponseDto.builder()
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .pfpUrl(user.getPfpUrl())
                .roles(user.getRoles().stream().map(Enum::name).toList())
                .enabled(user.isEnabled())
                .firstLogin(user.isFirstLogin())
                .build();
    }
}
