package ma.eniad.justificationservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record SubmitJustificationRequest(
        @NotNull(message = "sessionId is required")
        Long sessionId,

        Long studentId,

        String studentName,

        String studentCode,

        String studentFormation,

        String studentClass,

        String studentGroup,

        @NotBlank(message = "module is required")
        String module,

        @NotNull(message = "sessionDate is required")
        LocalDateTime sessionDate,

        @NotBlank(message = "reason is required")
        String reason,

        String documentUrl
) {
}
