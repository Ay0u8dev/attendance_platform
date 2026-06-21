package ma.eniad.userservice.dto.inscription;

import jakarta.validation.constraints.NotNull;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class StudentInscriptionRequestDTO {
    @NotNull
    private Long studentId;

    @NotNull
    private Long formationId;

    @NotNull
    private Long groupeId;

    @NotNull
    private Long academicYearId;
}
