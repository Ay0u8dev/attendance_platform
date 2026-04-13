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

    private List<Role> roles;

    private boolean enabled;


}

