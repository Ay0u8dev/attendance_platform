package ma.eniad.userservice.dto;

import jakarta.validation.constraints.NotNull;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class InscriptionRequestDTO {
    @NotNull
    private Long studentId;

    @NotNull
    private Long formationId;

    @NotNull
    private Long groupeId;

    @NotNull
    private Long academicYearId;
}
