package ma.eniad.attendanceservice.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ma.eniad.attendanceservice.entity.JustificationStatus;

public record AdminJustificationReviewRequest(
        @NotNull JustificationStatus status,
        @Size(max = 1000) String adminComment
) {
}
