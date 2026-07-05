package ma.eniad.userservice.dto.student;

import java.time.LocalDateTime;
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
    private String academicYear;
    private String cycle;
    private String filiere;
    private String groupe;
    private boolean faceEnrolled;
    private LocalDateTime faceEnrolledAt;
}

