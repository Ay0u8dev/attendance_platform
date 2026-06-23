package ma.eniad.attendanceservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record JustifyAbsenceRequest(
        @NotNull(message = "justificationId is required")
        Long justificationId,

        @NotBlank(message = "approvedBy is required")
        String approvedBy
) {
}
