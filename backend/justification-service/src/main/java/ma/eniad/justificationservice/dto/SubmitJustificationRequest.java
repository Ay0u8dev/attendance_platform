package ma.eniad.justificationservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SubmitJustificationRequest(
        @NotNull(message = "sessionId is required")
        Long sessionId,

        @NotBlank(message = "reason is required")
        String reason,

        String documentUrl
) {
}
