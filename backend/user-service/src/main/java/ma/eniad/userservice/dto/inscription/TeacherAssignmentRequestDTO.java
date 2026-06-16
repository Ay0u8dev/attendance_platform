package ma.eniad.userservice.dto.inscription;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class TeacherAssignmentRequestDTO {
    @NotNull
    @Positive
    private Long teacherId;

    @NotNull
    @Positive
    private Long academicYearId;

    @NotNull
    @Positive
    private Long formationId;

    @NotNull
    @Positive
    private Long groupeId;

    @NotNull
    @Positive
    private Long moduleId;
}
