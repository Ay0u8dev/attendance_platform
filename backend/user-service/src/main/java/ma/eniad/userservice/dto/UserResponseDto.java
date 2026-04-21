package ma.eniad.userservice.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class UserResponseDto {
    private String email;
    private String firstName;
    private String lastName;
    private String pfpUrl;
    private List<String> roles;
    private boolean enabled;
    private boolean firstLogin;
}

