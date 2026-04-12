package ma.eniad.userservice.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FindOrCreateUserRequest {
    private String email;
    private String username;
    private String firstName;
    private String lastName;
    private String pictureUrl;
}

