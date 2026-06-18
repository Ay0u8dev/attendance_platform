package ma.eniad.justificationservice.dto;

import jakarta.validation.constraints.NotBlank;

public record ReviewJustificationRequest(
        String reviewerId,

        @NotBlank(message = "reviewerName is required")
        String reviewerName,

        @NotBlank(message = "reviewerRole is required")
        String reviewerRole,

        String comment
) {
}
