package ma.eniad.userservice.dto.inscription;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TeacherAssignmentResponseDTO {
    private Long id;

    private Long teacherId;
    private String teacherEmail;
    private String teacherFirstName;
    private String teacherLastName;

    private Long academicYearId;
    private String academicYearName;

    private Long formationId;
    private String formationName;

    private Long groupeId;
    private String groupeName;

    private Long moduleId;
    private String moduleCode;
    private String moduleName;
}
