package ma.eniad.justificationservice.dto;

public record AttendanceJustificationRequest(
        Long justificationId,
        String approvedBy
) {
}
