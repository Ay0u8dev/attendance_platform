package ma.eniad.attendanceservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record JustifyAbsenceRequest(
        @NotNull(message = "justificationId is required")
        Long justificationId,

        @NotBlank(message = "decidedBy is required")
        String decidedBy,

        @NotBlank(message = "decidedByRole is required")
        String decidedByRole
) {
}
