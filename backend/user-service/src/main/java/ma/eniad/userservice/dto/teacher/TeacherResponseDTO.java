package ma.eniad.userservice.dto.teacher;

import java.time.LocalDateTime;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import ma.eniad.userservice.entity.enums.Role;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"roles"})
@ToString(exclude = {"email"})
public class TeacherResponseDTO {
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String pfpUrl;
    private Set<Role> roles;
    private boolean enabled;
    private boolean firstLogin;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}