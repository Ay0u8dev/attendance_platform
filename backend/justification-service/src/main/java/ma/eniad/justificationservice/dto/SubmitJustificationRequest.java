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

        String module,

        LocalDateTime sessionDate,

        @NotBlank(message = "reason is required")
        String reason,

        String documentUrl
) {
}
