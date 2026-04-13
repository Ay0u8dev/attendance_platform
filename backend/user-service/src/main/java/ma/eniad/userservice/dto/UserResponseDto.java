package ma.eniad.userservice.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class UserResponseDto {
    private Long id;
    private String email;
    private String username;
    private List<String> roles;
    private boolean enabled;
}

