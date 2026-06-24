package ma.eniad.justificationservice.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ma.eniad.justificationservice.entity.JustificationStatus;

public record DecisionJustificationRequest(
        @NotNull JustificationStatus status,
        @Size(max = 512) String comment
) {
}
