package ma.eniad.attendanceservice.dto;

import ma.eniad.attendanceservice.entity.JustificationStatus;

import java.time.LocalDateTime;

public record AdminJustificationResponse(
        Long id,
        Long sessionId,
        Long studentId,
        Long groupId,
        String studentFirstName,
        String studentLastName,
        String studentEmail,
        String numApogee,
        String courseLabel,
        String roomLabel,
        String teacherFullName,
        LocalDateTime absenceStartedAt,
        LocalDateTime absenceEndedAt,
        String motive,
        String attachmentLabel,
        JustificationStatus status,
        String adminComment,
        Long reviewedBy,
        LocalDateTime reviewedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
