package ma.eniad.authservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;


@Getter
@Setter
@ToString
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserDto {
    private Long id;
    @NotBlank
    @Email
    private String email;
    private String firstName;
    private String lastName;
    private String pfpUrl;
    @NotEmpty
    private List<Role> roles;
    private boolean enabled;
    private boolean firstLogin;
}

