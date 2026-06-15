package ma.eniad.userservice.dto.inscription;

import lombok.Getter;
import lombok.Setter;
import lombok.Builder;

@Getter
@Setter
@Builder
public class StudentInscriptionResponseDTO {
    private Long id;

    private Long studentId;
    private String studentFirstName;
    private String studentLastName;

    private Long formationId;
    private String formationName;

    private Long groupeId;
    private String groupeName;

    private Long academicYearId;
    private String academicYearName;
}
