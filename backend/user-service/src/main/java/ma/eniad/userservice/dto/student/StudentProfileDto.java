package ma.eniad.userservice.dto.student;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class StudentProfileDto {
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String pfpUrl;
    private String numApogee;
    private String filiere;
    private String groupe;
}
