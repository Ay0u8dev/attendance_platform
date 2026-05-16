package ma.eniad.userservice.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.Builder;

@Getter
@Setter
@Builder
public class InscriptionResponseDTO {
    private Long id;

    private Long studentId;
    private String studentName;

    private Long formationId;
    private String formationName;

    private Long groupeId;
    private String groupeName;

    private Long academicYearId;
    private String academicYearName;
}
