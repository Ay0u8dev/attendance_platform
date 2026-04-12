package ma.eniad.authservice.dto;

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

    private String email;
    private String username;
    private String password;

    private List<Role> roles;

    @Builder.Default
    private boolean enabled = true;


}

