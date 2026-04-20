package ma.eniad.userservice.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AuthUserRequest {
    private String email;
    private String pfpUrl;
}

